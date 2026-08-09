from dataclasses import replace

from app.core.json_persistence import JsonPersistenceMixin
from app.infrastructure.accreditation_store import AccreditationStore
from app.modules.diagnostics.domain.finding import (
    DiagnosticEvidenceRef,
    DiagnosticFinding,
    DiagnosticFindingRisk,
    DiagnosticFindingType,
    FindingDecisionStatus,
)

# 无预置诊断
_SEED_FINDINGS: list[DiagnosticFinding] = []


class InMemoryFindingRepository(JsonPersistenceMixin):
    _repo_name = "findings"

    def __init__(
        self,
        with_seed: bool = True,
        user_id: str | None = None,
        persistence: AccreditationStore | None = None,
    ) -> None:
        self._user_id = user_id or "template"
        self._persistence = persistence
        if with_seed:
            self._store: dict[str, DiagnosticFinding] = {
                f.id: f for f in _SEED_FINDINGS
            }
        else:
            self._store: dict[str, DiagnosticFinding] = {}
        self._load()

    def clone(self) -> "InMemoryFindingRepository":
        new_repo = InMemoryFindingRepository(
            with_seed=False, user_id=self._user_id, persistence=self._persistence
        )
        new_repo._store = {
            fid: replace(finding) for fid, finding in self._store.items()
        }
        return new_repo

    def clone_for_user(self, user_id: str) -> "InMemoryFindingRepository":
        new_repo = InMemoryFindingRepository(
            with_seed=False, user_id=user_id, persistence=self._persistence
        )
        if not new_repo._store:
            new_repo._store = {
                fid: replace(finding) for fid, finding in self._store.items()
            }
        return new_repo

    def _from_dict(self, data: dict) -> DiagnosticFinding | None:
        try:
            kwargs = dict(data)
            kwargs["type"] = DiagnosticFindingType(kwargs["type"])
            kwargs["risk"] = DiagnosticFindingRisk(kwargs["risk"])
            kwargs["decision_status"] = FindingDecisionStatus(kwargs["decision_status"])
            kwargs["evidence"] = tuple(
                DiagnosticEvidenceRef(**e) for e in kwargs.get("evidence", [])
            )
            return DiagnosticFinding(**kwargs)
        except (TypeError, KeyError, ValueError):
            return None

    async def list_all(
        self,
        *,
        course: str | None = None,
        risk: str | None = None,
        finding_type: str | None = None,
        major_id: str | None = None,
    ) -> list[DiagnosticFinding]:
        results = list(self._store.values())
        if course:
            results = [f for f in results if f.course == course]
        if risk:
            results = [f for f in results if f.risk == risk]
        if finding_type:
            results = [f for f in results if f.type == finding_type]
        if major_id is not None:
            results = [f for f in results if f.major_id == major_id]
        return results

    async def get_by_id(self, finding_id: str) -> DiagnosticFinding | None:
        return self._store.get(finding_id)

    async def add(self, finding: DiagnosticFinding) -> DiagnosticFinding:
        self._store[finding.id] = finding
        self._schedule_save()
        await self._record(finding, "finding.created")
        return finding

    async def add_many(self, findings: list[DiagnosticFinding]) -> list[DiagnosticFinding]:
        for f in findings:
            self._store[f.id] = f
        self._schedule_save()
        for finding in findings:
            await self._record(finding, "finding.created")
        return findings

    async def update_decision(
        self,
        finding_id: str,
        status: FindingDecisionStatus,
    ) -> DiagnosticFinding | None:
        existing = self._store.get(finding_id)
        if existing is None:
            return None
        updated = replace(existing, decision_status=status)
        self._store[finding_id] = updated
        self._schedule_save()
        await self._record(updated, "finding.decided")
        return updated

    async def _record(self, finding: DiagnosticFinding, action: str) -> None:
        if self._persistence is None:
            return
        await self._persistence.snapshot(
            tenant_id=self._user_id,
            entity_type="diagnostic-finding",
            entity=finding,
            version=finding.rule_version,
        )
        for evidence in finding.evidence:
            await self._persistence.evidence(
                tenant_id=self._user_id,
                evidence_id=evidence.id,
                subject_type="diagnostic-finding",
                subject_id=finding.id,
                source_name=evidence.object_name,
                source_version=evidence.object_version,
                coordinate=evidence.coordinate,
                fragment_type="diagnostic-evidence",
                excerpt=evidence.excerpt,
                content_hash=evidence.hash,
            )
        await self._persistence.audit(
            tenant_id=self._user_id,
            actor_id=self._user_id,
            action=action,
            entity_type="diagnostic-finding",
            entity_id=finding.id,
            detail={
                "decision_status": finding.decision_status.value,
                "rule_version": finding.rule_version,
            },
        )


    async def delete_by_course(self, course_name: str) -> int:
        """按 course 字段删除关联诊断发现（删除课程时联动清理）。"""
        target = (course_name or "").strip()
        target_norm = target.lower()
        if not target_norm:
            return 0
        to_delete = [
            fid
            for fid, f in self._store.items()
            if (f.course or "").strip()
            and (
                (f.course or "").strip() == target
                or target_norm in (f.course or "").strip().lower()
            )
        ]
        if not to_delete:
            return 0
        for fid in to_delete:
            self._store.pop(fid, None)
        self._schedule_save()
        return len(to_delete)

    async def delete_by_nodes(self, node_ids: set[str]) -> int:
        """删除引用已移除图谱节点的诊断发现（source/target 命中）。"""
        if not node_ids:
            return 0
        to_delete = [
            fid
            for fid, f in self._store.items()
            if f.source_node in node_ids or f.target_node in node_ids
        ]
        if not to_delete:
            return 0
        for fid in to_delete:
            self._store.pop(fid, None)
        self._schedule_save()
        return len(to_delete)

    async def delete_by_evidence_object(self, object_name: str) -> int:
        """删除证据引用指定材料对象的诊断发现（删除材料时联动清理）。"""
        target = (object_name or "").strip()
        if not target:
            return 0
        to_delete = [
            fid
            for fid, f in self._store.items()
            if any(ev.object_name == target for ev in f.evidence)
        ]
        if not to_delete:
            return 0
        for fid in to_delete:
            self._store.pop(fid, None)
        self._schedule_save()
        return len(to_delete)
