from dataclasses import dataclass

from app.modules.diagnostics.domain.finding import FindingDecisionStatus
from app.modules.improvements.domain.improvement import ImprovementStatus
from app.modules.recognition.domain.candidate import CandidateReviewStatus


@dataclass(frozen=True, slots=True)
class ReadinessCheck:
    code: str
    label: str
    passed: bool
    detail: str


@dataclass(frozen=True, slots=True)
class SupportReadiness:
    ready: bool
    checks: tuple[ReadinessCheck, ...]
    resource_count: int
    evidence_count: int
    pending_review_count: int
    pending_finding_count: int
    open_improvement_count: int


class GetSupportReadiness:
    def __init__(
        self,
        resources,
        candidates,
        findings,
        improvements,
        major_id: str | None,
    ) -> None:
        self._resources = resources
        self._candidates = candidates
        self._findings = findings
        self._improvements = improvements
        self._major_id = major_id

    async def execute(self, *, course: str | None = None) -> SupportReadiness:
        resources = await self._resources.list_all(course=course, major_id=self._major_id)
        candidates = await self._candidates.list_all(course=course)
        findings = await self._findings.list_all(course=course, major_id=self._major_id)
        improvements = await self._improvements.list_all(course=course, major_id=self._major_id)

        evidence_count = sum(len(resource.evidence_fragments) for resource in resources)
        pending_reviews = [
            item for item in candidates if item.review_status == CandidateReviewStatus.PENDING
        ]
        pending_findings = [
            item for item in findings if item.decision_status == FindingDecisionStatus.PENDING
        ]
        open_improvements = [
            item
            for item in improvements
            if item.status not in {ImprovementStatus.RESOLVED, ImprovementStatus.CLOSED}
        ]
        checks = (
            ReadinessCheck(
                code="materials",
                label="教学材料已纳入范围",
                passed=bool(resources),
                detail=f"已纳入 {len(resources)} 份材料",
            ),
            ReadinessCheck(
                code="evidence",
                label="材料证据可追溯",
                passed=bool(resources) and evidence_count >= len(resources),
                detail=f"已登记 {evidence_count} 条证据",
            ),
            ReadinessCheck(
                code="reviews",
                label="关系候选已完成审核",
                passed=not pending_reviews,
                detail=f"{len(pending_reviews)} 条关系待审核",
            ),
            ReadinessCheck(
                code="findings",
                label="诊断结论已完成处置",
                passed=not pending_findings,
                detail=f"{len(pending_findings)} 条诊断待处置",
            ),
            ReadinessCheck(
                code="improvements",
                label="改进事项已闭环",
                passed=not open_improvements,
                detail=f"{len(open_improvements)} 项改进未闭环",
            ),
        )
        return SupportReadiness(
            ready=all(check.passed for check in checks),
            checks=checks,
            resource_count=len(resources),
            evidence_count=evidence_count,
            pending_review_count=len(pending_reviews),
            pending_finding_count=len(pending_findings),
            open_improvement_count=len(open_improvements),
        )
