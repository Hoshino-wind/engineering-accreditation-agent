from pydantic import BaseModel

from app.modules.support.application import SupportReadiness


class SupportReadinessCheckResponse(BaseModel):
    code: str
    label: str
    passed: bool
    detail: str


class SupportReadinessResponse(BaseModel):
    ready: bool
    checks: list[SupportReadinessCheckResponse]
    resourceCount: int
    evidenceCount: int
    pendingReviewCount: int
    pendingFindingCount: int
    openImprovementCount: int

    @classmethod
    def from_domain(cls, result: SupportReadiness) -> "SupportReadinessResponse":
        return cls(
            ready=result.ready,
            checks=[
                SupportReadinessCheckResponse(
                    code=check.code,
                    label=check.label,
                    passed=check.passed,
                    detail=check.detail,
                )
                for check in result.checks
            ],
            resourceCount=result.resource_count,
            evidenceCount=result.evidence_count,
            pendingReviewCount=result.pending_review_count,
            pendingFindingCount=result.pending_finding_count,
            openImprovementCount=result.open_improvement_count,
        )
