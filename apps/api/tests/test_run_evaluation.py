import asyncio

from app.modules.evaluations.application import ExportEvaluationAudit, RunEvaluation


class GraphQuery:
    async def current_graph(self):
        return {
            "nodes": [
                {
                    "id": "comp-1",
                    "kind": "Competency",
                    "code": "C-01-01",
                    "name": "Engineering knowledge",
                    "origin": "standard",
                },
                {
                    "id": "course-1",
                    "kind": "Course",
                    "code": "COURSE-01",
                    "name": "Data Structures",
                    "origin": "school",
                },
            ],
            "edges": [
                {
                    "id": "support-1",
                    "source": "course-1",
                    "target": "comp-1",
                    "kind": "SUPPORTS",
                    "reviewStatus": "approved",
                    "strength": "strong",
                },
            ],
        }


class AuditStore:
    def __init__(self) -> None:
        self.snapshot_call = None
        self.audit_call = None

    async def snapshot(self, **kwargs) -> None:
        self.snapshot_call = kwargs

    async def audit(self, **kwargs) -> None:
        self.audit_call = kwargs

    async def get_snapshot(self, **kwargs):
        if kwargs["entity_id"] != "evaluation-1":
            return None
        return {"payload": {"rule_version": "rules-v1"}, "version": "rules-v1"}

    async def list_audit_events(self, **_kwargs):
        return [{"action": "evaluation.completed"}]


def test_run_evaluation_records_rule_and_input_snapshot() -> None:
    store = AuditStore()
    run = asyncio.run(
        RunEvaluation(
            graph_query=GraphQuery(),
            tenant_id="user-pilot",
            audit_store=store,
        ).execute(rule_version="rules-v1")
    )

    assert run.items[0].status == "covered"
    assert store.snapshot_call["entity_type"] == "evaluation-run"
    assert store.snapshot_call["version"] == "rules-v1"
    assert store.audit_call["detail"]["input_snapshot_hash"] == run.input_snapshot_hash


def test_export_evaluation_audit_uses_saved_snapshot_and_events() -> None:
    document = asyncio.run(
        ExportEvaluationAudit(tenant_id="user-pilot", audit_store=AuditStore()).execute(
            "evaluation-1"
        )
    )

    assert document is not None
    assert document["schema_version"] == "evaluation-audit-v1"
    assert document["evaluation"]["version"] == "rules-v1"
    assert document["audit_events"] == [{"action": "evaluation.completed"}]
