from .evaluation_read_model import EvaluationRunReadModel
from .score_import_batch import ScoreImportCandidateItem, ScoreValidationCheck
from .score_import_per_student import MissingScorePolicy, PerStudentDerivation


def _check(
    code: str,
    affected_input_ids: tuple[str, ...],
    *,
    expected: str,
    observed: str,
) -> ScoreValidationCheck:
    return ScoreValidationCheck(
        code=code,
        status="blocked" if affected_input_ids else "pass",
        affected_input_ids=affected_input_ids,
        expected=expected,
        observed=observed,
    )


def build_score_import_checks(
    base_run: EvaluationRunReadModel,
    candidate_items: tuple[ScoreImportCandidateItem, ...],
    *,
    roster_counts: dict[str, int] | None = None,
) -> tuple[ScoreValidationCheck, ...]:
    """构建汇总口径校验。

    ``roster_counts`` 仅由逐生口径提供：此时样本范围检查比较的是**花名册规模**
    而不是有效样本量，因为按 exclude 口径剔除缺考后有效样本本就应当小于花名册。
    """
    expected_ids = tuple(sorted(item.input_id for item in base_run.inputs))
    counts: dict[str, int] = {}
    for item in candidate_items:
        counts[item.input_id] = counts.get(item.input_id, 0) + 1
    submitted_ids = set(counts)
    expected_set = set(expected_ids)
    missing = tuple(sorted(expected_set - submitted_ids))
    duplicates = tuple(sorted(item_id for item_id, count in counts.items() if count > 1))
    unknown = tuple(sorted(submitted_ids - expected_set))
    missing_points = tuple(
        sorted(
            {
                item.input_id
                for item in candidate_items
                if item.earned_points_total is None or item.possible_points_total is None
            }
        )
    )
    invalid_points = tuple(
        sorted(
            {
                item.input_id
                for item in candidate_items
                if item.earned_points_total is not None
                and item.possible_points_total is not None
                and (
                    item.earned_points_total < 0
                    or item.possible_points_total <= 0
                    or item.earned_points_total > item.possible_points_total
                )
            }
        )
    )
    invalid_samples = tuple(
        sorted(
            {
                item.input_id
                for item in candidate_items
                if item.observed_student_count is None or item.observed_student_count < 1
            }
        )
    )
    if roster_counts is None:
        mismatched_samples = tuple(
            sorted(
                {
                    item.input_id
                    for item in candidate_items
                    if item.observed_student_count is not None
                    and item.observed_student_count >= 1
                    and item.observed_student_count != base_run.student_count
                }
            )
        )
    else:
        mismatched_samples = tuple(
            sorted(
                input_id
                for input_id, roster_count in roster_counts.items()
                if roster_count != base_run.student_count
            )
        )
    return (
        _check(
            "score_input.coverage",
            missing,
            expected=",".join(expected_ids),
            observed=",".join(sorted(submitted_ids & expected_set)),
        ),
        _check(
            "score_input.duplicates",
            duplicates,
            expected="none",
            observed=",".join(duplicates) or "none",
        ),
        _check(
            "score_input.unknown",
            unknown,
            expected="none",
            observed=",".join(unknown) or "none",
        ),
        _check(
            "score_input.points_present",
            missing_points,
            expected="earned_and_possible",
            observed=",".join(missing_points) or "complete",
        ),
        _check(
            "score_input.points_range",
            invalid_points,
            expected="0<=earned<=possible;possible>0",
            observed=",".join(invalid_points) or "valid",
        ),
        _check(
            "score_input.sample_positive",
            invalid_samples,
            expected="positive_integer",
            observed=",".join(invalid_samples) or "valid",
        ),
        _check(
            "score_input.sample_scope",
            mismatched_samples,
            expected=str(base_run.student_count),
            observed=",".join(mismatched_samples) or str(base_run.student_count),
        ),
    )


def build_per_student_checks(
    base_run: EvaluationRunReadModel,
    derivations: tuple[PerStudentDerivation, ...],
    policy: MissingScorePolicy,
) -> tuple[ScoreValidationCheck, ...]:
    """在汇总校验之外，追加只有逐生数据才能做的检查。

    这些检查是逐生口径的核心价值：花名册是否一致、是否有重复学生、
    原始分是否越界、缺失是否符合声明口径——汇总口径全都看不见。
    """
    aggregate_checks = build_score_import_checks(
        base_run,
        tuple(derivation.candidate for derivation in derivations),
        roster_counts={
            derivation.item.input_id: derivation.roster_count for derivation in derivations
        },
    )

    rosters = {
        derivation.item.input_id: frozenset(derivation.item.student_refs)
        for derivation in derivations
    }
    reference = next(iter(rosters.values()), frozenset())
    inconsistent_rosters = tuple(
        sorted(input_id for input_id, roster in rosters.items() if roster != reference)
    )
    duplicated = tuple(
        sorted(
            derivation.item.input_id
            for derivation in derivations
            if derivation.item.duplicate_student_refs
        )
    )
    out_of_range = tuple(
        sorted(
            derivation.item.input_id
            for derivation in derivations
            if derivation.item.out_of_range_student_refs
        )
    )
    policy_blocked = tuple(
        sorted(derivation.item.input_id for derivation in derivations if derivation.blockers)
    )
    total_missing = sum(derivation.missing_count for derivation in derivations)

    return (
        *aggregate_checks,
        _check(
            "score_student.roster_consistent",
            inconsistent_rosters,
            expected=f"{len(reference)}_students_on_every_input",
            observed=",".join(inconsistent_rosters) or "consistent",
        ),
        _check(
            "score_student.duplicates",
            duplicated,
            expected="none",
            observed=",".join(duplicated) or "none",
        ),
        _check(
            "score_student.raw_score_range",
            out_of_range,
            expected="0<=raw_score<=max_score",
            observed=",".join(out_of_range) or "valid",
        ),
        _check(
            "score_student.missing_policy",
            policy_blocked,
            expected=f"policy={policy}",
            observed=(
                ",".join(policy_blocked)
                if policy_blocked
                else f"policy={policy};missing={total_missing}"
            ),
        ),
    )


__all__ = ["build_per_student_checks", "build_score_import_checks"]
