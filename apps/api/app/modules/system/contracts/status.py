from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.modules.system.domain.status import ComponentStatus, OverallStatus, SystemStatusSnapshot


class SystemComponentResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    key: str
    name: str
    status: ComponentStatus
    detail: str


class SystemStatusResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    service: str
    version: str
    environment: str
    status: OverallStatus
    checked_at: datetime
    components: list[SystemComponentResponse]

    @classmethod
    def from_snapshot(cls, snapshot: SystemStatusSnapshot) -> "SystemStatusResponse":
        return cls(
            service=snapshot.service,
            version=snapshot.version,
            environment=snapshot.environment,
            status=snapshot.status,
            checked_at=snapshot.checked_at,
            components=[
                SystemComponentResponse(
                    key=component.key,
                    name=component.name,
                    status=component.status,
                    detail=component.detail,
                )
                for component in snapshot.components
            ],
        )
