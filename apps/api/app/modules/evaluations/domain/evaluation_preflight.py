import hashlib
import json
from dataclasses import asdict, dataclass
from decimal import Decimal
from typing import Literal

from .evaluation_read_model import (
    WEIGHT_TOLERANCE,
    EvaluationRunSnapshot,
    ReadinessCheckStatus,
)

EvaluationPreflightStatus = Literal["ready", "blocked"]
EvaluationPreflightReportVersion = Literal["evaluation-preflight:v1"]
EVALUATION_PREFLIGHT_REPORT_VERSION: EvaluationPreflightReportVersion = (
    "evaluation-preflight:v1"
)
EvaluationPreflightOwner = Literal[
    "score_input",
    "ability_graph",
    "evaluation_policy",
    "evaluation_owner",
]
EvaluationPreflightAction = Literal[
    "none",
    "prepare_score_data",
    "repair_graph_relation",
    "review_evaluation_policy",
    "inspect_input_snapshot",
]


@dataclass(frozen=True, slots=True)
class EvaluationPreflightCheck:
    check_id: str
    label: str
    detail: str
    status: ReadinessCheckStatus
    owner: EvaluationPreflightOwner
    action: EvaluationPreflightAction


@dataclass(frozen=True, slots=True)
class EvaluationPreflightMissingInput:
    input_id: str
    label: str
    evidence_name: str


@dataclass(frozen=True, slots=True)
class EvaluationPreflightReport:
    report_version: EvaluationPreflightReportVersion
    run_id: str
    evaluation_object_id: str
    input_snapshot_digest: str
    status: EvaluationPreflightStatus
    blockers: tuple[str, ...]
    checks: tuple[EvaluationPreflightCheck, ...]
    missing_inputs: tuple[EvaluationPreflightMissingInput, ...]
    report_digest: str

    @property
    def passed_check_count(self) -> int:
        return sum(check.status == "pass" for check in self.checks)

    @property
    def blocked_check_count(self) -> int:
        return sum(check.status == "blocked" for check in self.checks)


_CHECK_OWNERSHIP: dict[
    str,
    tuple[EvaluationPreflightOwner, EvaluationPreflightAction],
] = {
    "exceptions": ("score_input", "prepare_score_data"),
    "relations": ("ability_graph", "repair_graph_relation"),
    "scores": ("score_input", "prepare_score_data"),
    "weights": ("evaluation_policy", "review_evaluation_policy"),
}


def _classify_check(
    check_id: str,
    status: ReadinessCheckStatus,
) -> tuple[EvaluationPreflightOwner, EvaluationPreflightAction]:
    owner, blocked_action = _CHECK_OWNERSHIP.get(
        check_id,
        ("evaluation_owner", "inspect_input_snapshot"),
    )
    return owner, blocked_action if status == "blocked" else "none"


def _report_digest(payload: dict[str, object]) -> str:
    canonical = json.dumps(
        payload,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )
    return f"sha256:{hashlib.sha256(canonical.encode('utf-8')).hexdigest()}"


def _source_check(
    check_id: str,
    label: str,
    detail: str,
    status: ReadinessCheckStatus,
) -> EvaluationPreflightCheck:
    owner, action = _classify_check(check_id, status)
    return EvaluationPreflightCheck(
        check_id=check_id,
        label=label,
        detail=detail,
        status=status,
        owner=owner,
        action=action,
    )


def _derived_check_id(kind: str, identity: str) -> str:
    digest = hashlib.sha256(identity.encode("utf-8")).hexdigest()[:16]
    return f"calculation:{kind}:{digest}"


def build_evaluation_preflight_report(
    snapshot: EvaluationRunSnapshot,
) -> EvaluationPreflightReport:
    run = snapshot.run
    checks = [
        _source_check(
            check_id=check.check_id,
            label=check.label,
            detail=check.detail,
            status=check.status,
        )
        for check in run.readiness_checks
    ]
    missing_inputs = tuple(
        EvaluationPreflightMissingInput(
            input_id=item.input_id,
            label=item.label,
            evidence_name=item.evidence_name,
        )
        for item in run.inputs
        if item.score_rate is None
    )
    covered_blockers = {
        check.detail for check in checks if check.status == "blocked"
    }
    for item in missing_inputs:
        detail = f"{item.label}缺少有效得分率"
        if detail in covered_blockers:
            continue
        checks.append(
            EvaluationPreflightCheck(
                check_id=_derived_check_id("missing-score", item.input_id),
                label=f"{item.label}得分率缺失",
                detail=detail,
                status="blocked",
                owner="score_input",
                action="prepare_score_data",
            )
        )
        covered_blockers.add(detail)

    raw_weight_total = sum(
        (item.weight for item in run.inputs),
        start=Decimal("0"),
    )
    if abs(raw_weight_total - Decimal("1")) > WEIGHT_TOLERANCE:
        detail = (
            f"评分项权重合计为 {snapshot.calculation.weight_total}，必须等于 1"
        )
        if detail not in covered_blockers:
            checks.append(
                EvaluationPreflightCheck(
                    check_id="calculation:weight-total",
                    label="评分项权重未闭合",
                    detail=detail,
                    status="blocked",
                    owner="evaluation_policy",
                    action="review_evaluation_policy",
                )
            )
            covered_blockers.add(detail)

    for blocker in snapshot.calculation.blockers:
        if blocker in covered_blockers:
            continue
        checks.append(
            EvaluationPreflightCheck(
                check_id=_derived_check_id("unclassified", blocker),
                label="其他输入校验未通过",
                detail=blocker,
                status="blocked",
                owner="evaluation_owner",
                action="inspect_input_snapshot",
            )
        )
        covered_blockers.add(blocker)

    status: EvaluationPreflightStatus = (
        "ready" if snapshot.calculation.ready else "blocked"
    )
    if status == "blocked" and not any(
        check.status == "blocked" for check in checks
    ):
        checks.append(
            EvaluationPreflightCheck(
                check_id="calculation:unclassified",
                label="评价计算未就绪",
                detail="评价计算未提供可定位的阻断信息",
                status="blocked",
                owner="evaluation_owner",
                action="inspect_input_snapshot",
            )
        )

    report_checks = tuple(checks)
    digest_payload: dict[str, object] = {
        "blockers": snapshot.calculation.blockers,
        "checks": [asdict(check) for check in report_checks],
        "evaluation_object_id": run.evaluation_object_id,
        "input_snapshot_digest": run.input_snapshot.digest,
        "missing_inputs": [asdict(item) for item in missing_inputs],
        "report_version": EVALUATION_PREFLIGHT_REPORT_VERSION,
        "run_id": run.run_id,
        "status": status,
    }
    return EvaluationPreflightReport(
        report_version=EVALUATION_PREFLIGHT_REPORT_VERSION,
        run_id=run.run_id,
        evaluation_object_id=run.evaluation_object_id,
        input_snapshot_digest=run.input_snapshot.digest,
        status=status,
        blockers=snapshot.calculation.blockers,
        checks=report_checks,
        missing_inputs=missing_inputs,
        report_digest=_report_digest(digest_payload),
    )


__all__ = [
    "EvaluationPreflightAction",
    "EvaluationPreflightCheck",
    "EvaluationPreflightMissingInput",
    "EvaluationPreflightOwner",
    "EvaluationPreflightReport",
    "EvaluationPreflightReportVersion",
    "EvaluationPreflightStatus",
    "build_evaluation_preflight_report",
]
