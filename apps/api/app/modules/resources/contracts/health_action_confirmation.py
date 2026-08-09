from pydantic import BaseModel

from app.modules.resources.application.confirm_material_health_action import (
    ConfirmedMaterialHealthAction,
)


class ConfirmMaterialHealthActionRequest(BaseModel):
    riskCode: str
    resourceId: str | None = None


class ConfirmMaterialHealthActionResponse(BaseModel):
    improvementId: str
    created: bool

    @classmethod
    def from_domain(
        cls, result: ConfirmedMaterialHealthAction
    ) -> "ConfirmMaterialHealthActionResponse":
        return cls(improvementId=result.improvement.id, created=result.created)
