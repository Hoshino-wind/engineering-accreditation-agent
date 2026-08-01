from collections.abc import Callable
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from app.modules.diagnostics.application import DecideFinding, ListFindings
from app.modules.diagnostics.contracts import (
    DiagnosticFindingResponse,
    FindingDecisionRequest,
)


def create_diagnostics_router(
    list_findings_use_case: Callable[[], ListFindings],
    decide_finding_use_case: Callable[[], DecideFinding],
) -> APIRouter:
    router = APIRouter(prefix="/diagnostics", tags=["diagnostics"])

    @router.get(
        "/findings",
        response_model=list[DiagnosticFindingResponse],
        summary="获取诊断发现列表",
    )
    async def list_findings(
        use_case: Annotated[ListFindings, Depends(list_findings_use_case)],
        course: Annotated[str | None, Query(description="按课程筛选")] = None,
        risk: Annotated[str | None, Query(description="按风险等级筛选")] = None,
        finding_type: Annotated[str | None, Query(description="按发现类型筛选")] = None,
    ) -> list[DiagnosticFindingResponse]:
        findings = await use_case.execute(
            course=course,
            risk=risk,
            finding_type=finding_type,
        )
        return [DiagnosticFindingResponse.from_domain(f) for f in findings]

    @router.post(
        "/findings/{finding_id}/decision",
        response_model=DiagnosticFindingResponse,
        summary="处置诊断发现",
    )
    async def decide_finding(
        finding_id: str,
        body: FindingDecisionRequest,
        use_case: Annotated[DecideFinding, Depends(decide_finding_use_case)],
    ) -> DiagnosticFindingResponse:
        result = await use_case.execute(finding_id, body.decision)
        if result is None:
            raise HTTPException(status_code=404, detail="诊断发现不存在")
        return DiagnosticFindingResponse.from_domain(result)

    return router
