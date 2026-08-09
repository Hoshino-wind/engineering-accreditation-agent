from app.modules.resources.contracts.classify import ClassifyResourceResponse
from app.modules.resources.contracts.health import MaterialHealthResponse
from app.modules.resources.contracts.health_action_confirmation import (
    ConfirmMaterialHealthActionRequest,
    ConfirmMaterialHealthActionResponse,
)
from app.modules.resources.contracts.health_actions import MaterialHealthActionResponse
from app.modules.resources.contracts.resource import (
    RESOURCE_CATEGORIES,
    ConfirmCourseRequest,
    ConfirmCourseResponse,
    EvidenceFragmentResponse,
    ProcessingStageResponse,
    SuggestedCourseResponse,
    TeachingResourceResponse,
)

__all__ = [
    "ClassifyResourceResponse",
    "MaterialHealthResponse",
    "MaterialHealthActionResponse",
    "ConfirmMaterialHealthActionRequest",
    "ConfirmMaterialHealthActionResponse",
    "ConfirmCourseRequest",
    "ConfirmCourseResponse",
    "EvidenceFragmentResponse",
    "ProcessingStageResponse",
    "RESOURCE_CATEGORIES",
    "SuggestedCourseResponse",
    "TeachingResourceResponse",
]
