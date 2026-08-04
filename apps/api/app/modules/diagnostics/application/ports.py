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
    ) -> list[DiagnosticFinding]: ...

    async def get_by_id(self, finding_id: str) -> DiagnosticFinding | None: ...

    async def update_decision(
        self,
        finding_id: str,
        status: FindingDecisionStatus,
    ) -> DiagnosticFinding | None: ...

    async def replace_graph_findings(
        self,
        findings: list[DiagnosticFinding],
    ) -> list[DiagnosticFinding]: ...
