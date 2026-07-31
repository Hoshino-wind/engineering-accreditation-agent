from datetime import datetime
from typing import Protocol

from app.modules.teaching_graph.domain import GraphAuditEvent, GraphWorkspace


class GraphClock(Protocol):
    def now(self) -> datetime: ...


class GraphWorkspaceRepository(Protocol):
    async def get(self) -> GraphWorkspace | None: ...

    async def save(
        self,
        workspace: GraphWorkspace,
        *,
        expected_revision: int,
        action: str,
        summary: str,
        snapshot: dict[str, object] | None = None,
    ) -> GraphWorkspace: ...

    async def list_audit_events(self, limit: int) -> list[GraphAuditEvent]: ...


class GraphRevisionConflictError(Exception):
    pass


class GraphTransitionError(Exception):
    def __init__(self, issues: list[str]) -> None:
        super().__init__("；".join(issues))
        self.issues = issues


class GraphPublishBlockedError(Exception):
    def __init__(self, blockers: list[str]) -> None:
        super().__init__("；".join(blockers))
        self.blockers = blockers


class GraphSchemaUnsupportedError(Exception):
    def __init__(self, schema_version_id: str) -> None:
        self.schema_version_id = schema_version_id
        super().__init__(f"不支持的图谱 Schema：{schema_version_id}")
