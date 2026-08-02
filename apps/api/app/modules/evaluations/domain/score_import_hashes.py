import hashlib
import json
from dataclasses import asdict

from .evaluation_read_model import EvaluationRunReadModel
from .score_import_batch import (
    SCORE_IMPORT_REPORT_VERSION,
    SCORE_IMPORT_SCOPE,
    ScoreImportCandidateItem,
    ScoreImportProfile,
    ScoreImportValidationStatus,
    ScoreValidationCheck,
    canonical_decimal,
)


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


def score_import_request_hash(
    *,
    evaluation_object_id: str,
    base_run_id: str,
    profile: ScoreImportProfile,
    candidate_items: tuple[ScoreImportCandidateItem, ...],
) -> str:
    return stable_hash(
        {
            "base_run_id": base_run_id,
            "evaluation_object_id": evaluation_object_id,
            "items": candidate_payload(candidate_items),
            "operation": "create-score-import-batch:v1",
            "profile": profile,
        }
    )


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
) -> str:
    return stable_hash(
        {
            "base_context_digest": base_context_digest,
            "base_run_id": base_run_id,
            "evaluation_object_id": evaluation_object_id,
            "items": candidate_payload(candidate_items),
            "profile": profile,
            "scope": SCORE_IMPORT_SCOPE,
        }
    )


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
    "score_import_base_context_digest",
    "score_import_content_digest",
    "score_import_report_digest",
    "score_import_request_hash",
    "stable_hash",
]
