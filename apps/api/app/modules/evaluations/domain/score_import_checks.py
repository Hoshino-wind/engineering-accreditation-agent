from .evaluation_read_model import EvaluationRunReadModel
from .score_import_batch import ScoreImportCandidateItem, ScoreValidationCheck


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
) -> tuple[ScoreValidationCheck, ...]:
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


__all__ = ["build_score_import_checks"]
