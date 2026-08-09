from __future__ import annotations

from typing import Protocol

from app.modules.evaluations.rule_engine import EvaluationRuleSet, EvaluationRun, evaluate
from app.modules.orchestration.application.graph_query import QueryProjectedGraph
from app.modules.orchestration.domain.models import AbilityGraph, GraphEdge, GraphNode


class EvaluationAuditStore(Protocol):
    async def snapshot(
        self, *, tenant_id: str, entity_type: str, entity: object, version: str
    ) -> None: ...

    async def audit(
        self,
        *,
        tenant_id: str,
        actor_id: str,
        action: str,
        entity_type: str,
        entity_id: str,
        detail: dict[str, object],
    ) -> None: ...

    async def get_snapshot(
        self, *, tenant_id: str, entity_type: str, entity_id: str
    ) -> dict[str, object] | None: ...

    async def list_audit_events(
        self, *, tenant_id: str, entity_type: str, entity_id: str
    ) -> list[dict[str, object]]: ...


class RunEvaluation:
    def __init__(
        self,
        *,
        graph_query: QueryProjectedGraph,
        tenant_id: str,
        audit_store: EvaluationAuditStore | None,
    ) -> None:
        self._graph_query = graph_query
        self._tenant_id = tenant_id
        self._audit_store = audit_store

    async def execute(self, *, rule_version: str = "rules-v1") -> EvaluationRun:
        graph_data = await self._graph_query.current_graph()
        graph = AbilityGraph(
            nodes=[GraphNode.from_dict(node) for node in graph_data["nodes"]],
            edges=[GraphEdge.from_dict(edge) for edge in graph_data["edges"]],
        )
        run = evaluate(
            graph,
            graph_version="projected-graph-current",
            rules=EvaluationRuleSet(version=rule_version),
        )
        if self._audit_store is not None:
            await self._audit_store.snapshot(
                tenant_id=self._tenant_id,
                entity_type="evaluation-run",
                entity=run,
                version=run.rule_version,
            )
            await self._audit_store.audit(
                tenant_id=self._tenant_id,
                actor_id=self._tenant_id,
                action="evaluation.completed",
                entity_type="evaluation-run",
                entity_id=run.id,
                detail={
                    "rule_version": run.rule_version,
                    "input_snapshot_hash": run.input_snapshot_hash,
                    "graph_version": run.graph_version,
                },
            )
        return run


class ExportEvaluationAudit:
    def __init__(self, *, tenant_id: str, audit_store: EvaluationAuditStore | None) -> None:
        self._tenant_id = tenant_id
        self._audit_store = audit_store

    async def execute(self, evaluation_id: str) -> dict[str, object] | None:
        if self._audit_store is None:
            return None
        snapshot = await self._audit_store.get_snapshot(
            tenant_id=self._tenant_id,
            entity_type="evaluation-run",
            entity_id=evaluation_id,
        )
        if snapshot is None:
            return None
        events = await self._audit_store.list_audit_events(
            tenant_id=self._tenant_id,
            entity_type="evaluation-run",
            entity_id=evaluation_id,
        )
        return {
            "schema_version": "evaluation-audit-v1",
            "evaluation": snapshot,
            "audit_events": events,
        }


