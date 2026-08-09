from pathlib import PurePath
from typing import Protocol

from app.modules.resources.domain.resource import TeachingResource


class ResourceRepository(Protocol):
    async def list_all(
        self,
        *,
        course: str | None = None,
        status: str | None = None,
        resource_type: str | None = None,
        major_id: str | None = None,
    ) -> list[TeachingResource]: ...

    async def get_by_id(self, resource_id: str) -> TeachingResource | None: ...

    async def add(self, resource: TeachingResource) -> TeachingResource: ...

    async def delete(self, resource_id: str) -> bool: ...


class ObjectStoragePort(Protocol):
    async def put(self, *, key: str, content: bytes, content_type: str | None) -> None: ...


def resource_object_key(owner_id: str, resource_id: str, file_name: str) -> str:
    safe_name = PurePath(file_name).name or "upload.bin"
    return f"tenants/{owner_id}/resources/{resource_id}/{safe_name}"


class TaskCancellationPort(Protocol):
    """用于取消正在进行的资源分析任务的端口。"""

    async def cancel(self, resource_id: str) -> None: ...
