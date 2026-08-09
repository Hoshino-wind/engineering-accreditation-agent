from pydantic import BaseModel

from app.modules.improvements.application.complete_material_health_improvement import (
    ImprovementCompletion,
)
from app.modules.improvements.contracts.improvement import ImprovementResponse


class ImprovementCompletionResponse(BaseModel):
    improvement: ImprovementResponse
    verified: bool
    message: str

    @classmethod
    def from_domain(cls, result: ImprovementCompletion) -> "ImprovementCompletionResponse":
        return cls(
            improvement=ImprovementResponse.from_domain(result.improvement),
            verified=result.verified,
            message=result.message,
        )
