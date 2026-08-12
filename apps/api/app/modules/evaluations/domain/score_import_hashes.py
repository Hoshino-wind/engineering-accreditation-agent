import hashlib
import json
from dataclasses import asdict

from .evaluation_read_model import EvaluationRunReadModel
from .score_import_batch import (
    SCORE_IMPORT_REPORT_VERSION,
    SCORE_IMPORT_SCOPE,
    ScoreImportCandidateItem,
    ScoreImportProfile,
    ScoreImportScope,
    ScoreImportValidationStatus,
    ScoreValidationCheck,
    canonical_decimal,
)
from .score_import_per_student import PerStudentScoreItem


def stable_hash(payload: object) -> str:
    canonical = json.dumps(
        payload,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )
    return f"sha256:{hashlib.sha256(canonical.encode('utf-8')).hexdigest()}"


def candidate_payload(
    candidate_items: tuple[ScoreImportCandidateItem, ...],
) -> list[dict[str, object]]:
    ordered_items = sorted(
        candidate_items,
        key=lambda item: (
            item.input_id,
            canonical_decimal(item.earned_points_total) or "",
            canonical_decimal(item.possible_points_total) or "",
            (
                -1
                if item.observed_student_count is None
                else item.observed_student_count
            ),
        ),
    )
    return [
        {
            "earned_points_total": canonical_decimal(item.earned_points_total),
            "input_id": item.input_id,
            "observed_student_count": item.observed_student_count,
            "possible_points_total": canonical_decimal(item.possible_points_total),
        }
        for item in ordered_items
    ]


def per_student_payload(
    *,
    items: tuple[PerStudentScoreItem, ...],
    missing_score_policy: str,
    score_rate_scale: int,
) -> dict[str, object]:
    """逐生原始分的规范化摘要载荷。

    原始分、满分和缺失值口径都必须进入摘要：否则两批来自不同花名册、
    或按不同缺失口径处理的数据可能得到相同的汇总总分，从而摘要相同——
    那样“可复算”就退化成了“加权求和可复算”。
    """
    return {
        "items": [
            {
                "entries": [
                    {
                        "raw_score": canonical_decimal(entry.raw_score),
                        "student_ref": entry.student_ref,
                    }
                    for entry in sorted(item.entries, key=lambda entry: entry.student_ref)
                ],
                "input_id": item.input_id,
                "max_score": canonical_decimal(item.max_score),
            }
            for item in sorted(items, key=lambda item: item.input_id)
        ],
        "missing_score_policy": missing_score_policy,
        "score_rate_scale": score_rate_scale,
    }


def score_import_request_hash(
    *,
    evaluation_object_id: str,
    base_run_id: str,
    profile: ScoreImportProfile,
    candidate_items: tuple[ScoreImportCandidateItem, ...],
    per_student: dict[str, object] | None = None,
) -> str:
    payload: dict[str, object] = {
        "base_run_id": base_run_id,
        "evaluation_object_id": evaluation_object_id,
        "items": candidate_payload(candidate_items),
        "operation": "create-score-import-batch:v1",
        "profile": profile,
    }
    # 仅在逐生口径下追加键，保证汇总口径的既有摘要逐字节不变。
    if per_student is not None:
        payload["per_student"] = per_student
    return stable_hash(payload)


def score_import_base_context_digest(run: EvaluationRunReadModel) -> str:
    return stable_hash(
        {
            "base_run_id": run.run_id,
            "evaluation_object_id": run.evaluation_object_id,
            "expected_inputs": [
                {
                    "input_id": item.input_id,
                    "weight": canonical_decimal(item.weight),
                }
                for item in sorted(run.inputs, key=lambda item: item.input_id)
            ],
            "student_count": run.student_count,
        }
    )


def score_import_content_digest(
    *,
    evaluation_object_id: str,
    base_run_id: str,
    base_context_digest: str,
    profile: ScoreImportProfile,
    candidate_items: tuple[ScoreImportCandidateItem, ...],
    scope: ScoreImportScope = SCORE_IMPORT_SCOPE,
    per_student: dict[str, object] | None = None,
) -> str:
    payload: dict[str, object] = {
        "base_context_digest": base_context_digest,
        "base_run_id": base_run_id,
        "evaluation_object_id": evaluation_object_id,
        "items": candidate_payload(candidate_items),
        "profile": profile,
        "scope": scope,
    }
    if per_student is not None:
        payload["per_student"] = per_student
    return stable_hash(payload)


def score_import_report_digest(
    *,
    content_digest: str,
    validator_version: str,
    validation_status: ScoreImportValidationStatus,
    checks: tuple[ScoreValidationCheck, ...],
    limitations: tuple[str, ...],
) -> str:
    return stable_hash(
        {
            "checks": [asdict(check) for check in checks],
            "content_digest": content_digest,
            "limitations": limitations,
            "report_version": SCORE_IMPORT_REPORT_VERSION,
            "validation_status": validation_status,
            "validator_version": validator_version,
        }
    )


__all__ = [
    "candidate_payload",
    "per_student_payload",
    "score_import_base_context_digest",
    "score_import_content_digest",
    "score_import_report_digest",
    "score_import_request_hash",
    "stable_hash",
]
