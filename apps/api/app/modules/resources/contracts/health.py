from pydantic import BaseModel

from app.modules.resources.application.material_health import MaterialHealth


class MaterialHealthRiskResponse(BaseModel):
    code: str
    severity: str
    message: str
    resourceId: str | None = None


class MaterialHealthResponse(BaseModel):
    healthScore: int
    totalResources: int
    readyCount: int
    processingCount: int
    failedCount: int
    quarantinedCount: int
    riskCount: int
    risks: list[MaterialHealthRiskResponse]

    @classmethod
    def from_domain(cls, result: MaterialHealth) -> "MaterialHealthResponse":
        return cls(
            healthScore=result.health_score,
            totalResources=result.total_resources,
            readyCount=result.ready_count,
            processingCount=result.processing_count,
            failedCount=result.failed_count,
            quarantinedCount=result.quarantined_count,
            riskCount=result.risk_count,
            risks=[
                MaterialHealthRiskResponse(
                    code=risk.code,
                    severity=risk.severity,
                    message=risk.message,
                    resourceId=risk.resource_id,
                )
                for risk in result.risks
            ],
        )
