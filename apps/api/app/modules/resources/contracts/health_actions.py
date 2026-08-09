from pydantic import BaseModel

from app.modules.resources.application.material_health_actions import MaterialHealthAction


class MaterialHealthActionResponse(BaseModel):
    riskCode: str
    resourceId: str | None = None
    priority: str
    ownerRole: str
    action: str
    requiresHumanReview: bool

    @classmethod
    def from_domain(cls, item: MaterialHealthAction) -> "MaterialHealthActionResponse":
        return cls(
            riskCode=item.risk_code,
            resourceId=item.resource_id,
            priority=item.priority,
            ownerRole=item.owner_role,
            action=item.action,
            requiresHumanReview=item.requires_human_review,
        )
