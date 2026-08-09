import json
from collections.abc import Callable
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response

from app.modules.evaluations.application import ExportEvaluationAudit, RunEvaluation
from app.modules.evaluations.contracts import EvaluationRunResponse


def create_evaluations_router(
    provide_run_evaluation: Callable[[], RunEvaluation],
    provide_export_audit: Callable[[], ExportEvaluationAudit],
) -> APIRouter:
    router = APIRouter(prefix="/evaluations", tags=["evaluations"])

    @router.post("/runs", response_model=EvaluationRunResponse)
    async def run_evaluation(
        use_case: Annotated[RunEvaluation, Depends(provide_run_evaluation)],
        rule_version: Annotated[str, Query()] = "rules-v1",
    ) -> EvaluationRunResponse:
        return EvaluationRunResponse.from_domain(
            await use_case.execute(rule_version=rule_version)
        )

    @router.get("/runs/{evaluation_id}/audit")
    async def export_evaluation_audit(
        evaluation_id: str,
        use_case: Annotated[ExportEvaluationAudit, Depends(provide_export_audit)],
    ) -> Response:
        document = await use_case.execute(evaluation_id)
        if document is None:
            return Response(status_code=404)
        return Response(
            content=json.dumps(document, ensure_ascii=False, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{evaluation_id}-audit.json"'},
        )

    return router
