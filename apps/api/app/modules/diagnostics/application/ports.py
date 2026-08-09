from typing import Protocol

from app.modules.diagnostics.domain.finding import (
    DiagnosticFinding,
    FindingDecisionStatus,
)


class FindingRepository(Protocol):
    async def list_all(
        self,
        *,
        course: str | None = None,
        risk: str | None = None,
        finding_type: str | None = None,
        major_id: str | None = None,
    ) -> list[DiagnosticFinding]: ...

    async def get_by_id(self, finding_id: str) -> DiagnosticFinding | None: ...

    async def update_decision(
        self,
        finding_id: str,
        status: FindingDecisionStatus,
    ) -> DiagnosticFinding | None: ...

    async def delete_by_course(self, course_name: str) -> int: ...

    async def delete_by_nodes(self, node_ids: set[str]) -> int: ...

    async def delete_by_evidence_object(self, object_name: str) -> int: ...
