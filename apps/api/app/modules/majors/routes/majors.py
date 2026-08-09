"""专业路由：列表/新建/删除，供前端专业切换器/管理使用。"""

from collections.abc import Callable
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.modules.majors.application import (
    CreateMajor,
    DeleteMajor,
    GetMajorAnalysis,
    GetMajorHealthOverview,
    GetMajorSummary,
    ListMajors,
    MajorAlreadyExistsError,
    MajorNotFoundError,
)
from app.modules.majors.contracts import (
    CreateMajorRequest,
    MajorHealthOverviewResponse,
    MajorResponse,
)


def create_majors_router(
    list_majors_use_case: Callable[[], ListMajors],
    create_majors_use_case: Callable[[], CreateMajor],
    delete_majors_use_case: Callable[[], DeleteMajor],
    health_overview_use_case: Callable[[], GetMajorHealthOverview],
    analysis_use_case: Callable[[], GetMajorAnalysis],
    summary_use_case: Callable[[], GetMajorSummary],
) -> APIRouter:
    router = APIRouter(prefix="/majors", tags=["majors"])

    @router.get(
        "",
        response_model=list[MajorResponse],
        summary="获取专业列表",
    )
    async def list_majors(
        use_case: Annotated[ListMajors, Depends(list_majors_use_case)],
    ) -> list[MajorResponse]:
        majors = await use_case.execute()
        return [MajorResponse.from_domain(m) for m in majors]

    @router.get("/analysis", response_model=dict, summary="专业分析与资源优化建议")
    async def get_analysis(
        major_id: str,
        use_case: Annotated[GetMajorAnalysis, Depends(analysis_use_case)],
    ) -> dict:
        result = await use_case.execute(major_id)
        return {
            "majorId": result.major_id,
            "majorName": result.major_name,
            "resourceCount": result.resource_count,
            "healthScore": result.health_score,
            "riskCount": result.risk_count,
            "coverageRate": result.coverage_rate,
            "gapCompetencies": result.gap_competencies,
            "suggestions": [
                {
                    "kind": s.kind,
                    "target": s.target,
                    "reason": s.reason,
                    "detail": s.detail,
                    "priority": s.priority,
                }
                for s in result.suggestions
            ],
        }

    @router.get("/summary", response_model=dict, summary="学院级汇总（多专业对比）")
    async def get_summary(
        use_case: Annotated[GetMajorSummary, Depends(summary_use_case)],
    ) -> dict:
        result = await use_case.execute()
        return {
            "majorCount": result.major_count,
            "averageHealth": result.average_health,
            "rows": [
                {
                    "majorId": r.major_id,
                    "majorName": r.major_name,
                    "resourceCount": r.resource_count,
                    "healthScore": r.health_score,
                    "riskCount": r.risk_count,
                    "coverageRate": r.coverage_rate,
                }
                for r in result.rows
            ],
        }

    @router.get("/health-overview", response_model=MajorHealthOverviewResponse)
    async def get_health_overview(
        use_case: Annotated[GetMajorHealthOverview, Depends(health_overview_use_case)],
    ) -> MajorHealthOverviewResponse:
        return MajorHealthOverviewResponse.from_domain(await use_case.execute())

    @router.post(
        "",
        response_model=MajorResponse,
        status_code=status.HTTP_201_CREATED,
        summary="新建专业",
    )
    async def create_major(
        req: CreateMajorRequest,
        use_case: Annotated[CreateMajor, Depends(create_majors_use_case)],
    ) -> MajorResponse:
        try:
            created = await use_case.execute(
                name=req.name,
                code=req.code,
                school_name=req.schoolName,
                standard_version=req.standardVersion,
                description=req.description,
            )
        except MajorAlreadyExistsError as e:
            raise HTTPException(status.HTTP_409_CONFLICT, str(e)) from e
        except ValueError as e:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e)) from e
        return MajorResponse.from_domain(created)

    @router.delete(
        "/{major_id}",
        status_code=status.HTTP_204_NO_CONTENT,
        summary="删除专业",
    )
    async def delete_major(
        major_id: str,
        use_case: Annotated[DeleteMajor, Depends(delete_majors_use_case)],
    ) -> None:
        try:
            await use_case.execute(major_id)
        except MajorNotFoundError as e:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e

    return router
