from dataclasses import replace
from datetime import UTC

from app.core.json_persistence import JsonPersistenceMixin
from app.infrastructure.accreditation_store import AccreditationStore
from app.modules.improvements.domain.improvement import (
    Improvement,
    ImprovementPriority,
    ImprovementStatus,
)

_SEED_IMPROVEMENTS: list[Improvement] = []


class InMemoryImprovementRepository(JsonPersistenceMixin):
    _repo_name = "improvements"

    def __init__(
        self,
        with_seed: bool = False,
        user_id: str | None = None,
        persistence: AccreditationStore | None = None,
    ) -> None:
        self._user_id = user_id or "template"
        self._persistence = persistence
        self._store: dict[str, Improvement] = {}
        self._load()

    def clone(self) -> "InMemoryImprovementRepository":
        new_repo = InMemoryImprovementRepository(
            with_seed=False,
            user_id=self._user_id,
            persistence=self._persistence,
        )
        new_repo._store = {
            iid: replace(imp) for iid, imp in self._store.items()
        }
        return new_repo

    def clone_for_user(self, user_id: str) -> "InMemoryImprovementRepository":
        new_repo = InMemoryImprovementRepository(
            with_seed=False,
            user_id=user_id,
            persistence=self._persistence,
        )
        if not new_repo._store:
            new_repo._store = {
                iid: replace(imp) for iid, imp in self._store.items()
            }
        return new_repo

    def _from_dict(self, data: dict) -> Improvement | None:
        try:
            kwargs = dict(data)
            kwargs["status"] = ImprovementStatus(kwargs["status"])
            kwargs["priority"] = ImprovementPriority(kwargs["priority"])
            return Improvement(**kwargs)
        except (TypeError, KeyError, ValueError):
            return None

    async def list_all(
        self,
        *,
        course: str | None = None,
        status: str | None = None,
        major_id: str | None = None,
    ) -> list[Improvement]:
        results = list(self._store.values())
        if course:
            results = [i for i in results if i.course == course]
        if status:
            results = [i for i in results if i.status == status]
        if major_id is not None:
            results = [i for i in results if i.major_id == major_id]
        return results

    async def get_by_id(self, improvement_id: str) -> Improvement | None:
        return self._store.get(improvement_id)

    async def add(self, improvement: Improvement) -> Improvement:
        self._store[improvement.id] = improvement
        self._schedule_save()
        await self._record(improvement, "improvement.created")
        return improvement

    async def update_status(
        self,
        improvement_id: str,
        status: ImprovementStatus,
    ) -> Improvement | None:
        existing = self._store.get(improvement_id)
        if existing is None:
            return None
        from datetime import datetime
        now = datetime.now(UTC).strftime("%Y-%m-%d %H:%M")
        closed_at = now if status == ImprovementStatus.CLOSED else None
        updated = replace(existing, status=status, updated_at=now, closed_at=closed_at)
        self._store[improvement_id] = updated
        self._schedule_save()
        await self._record(updated, "improvement.status_updated")
        return updated

    async def update(
        self,
        improvement_id: str,
        changes: dict,
    ) -> Improvement | None:
        existing = self._store.get(improvement_id)
        if existing is None:
            return None
        from datetime import datetime

        allowed = {
            "title",
            "description",
            "course",
            "finding_id",
            "target_code",
            "target_name",
            "root_cause",
            "action",
            "expected_effect",
            "owner",
            "deadline",
            "source_module",
            "source_label",
            "verification_method",
            "completion_summary",
            "evidence_uri",
            "reevaluation_result",
            "baseline",
            "target_value",
            "major_id",
            "priority",
            "status",
        }
        payload = {key: value for key, value in changes.items() if key in allowed}
        if "priority" in payload and payload["priority"] is not None:
            payload["priority"] = ImprovementPriority(payload["priority"])
        if "status" in payload and payload["status"] is not None:
            payload["status"] = ImprovementStatus(payload["status"])

        now = datetime.now(UTC).strftime("%Y-%m-%d %H:%M")
        payload["updated_at"] = now
        if payload.get("status") == ImprovementStatus.CLOSED and existing.closed_at is None:
            payload["closed_at"] = now
        elif payload.get("status") and payload.get("status") != ImprovementStatus.CLOSED:
            payload["closed_at"] = None

        updated = replace(existing, **payload)
        self._store[improvement_id] = updated
        self._schedule_save()
        await self._record(updated, "improvement.updated")
        return updated

    async def _record(self, improvement: Improvement, action: str) -> None:
        if self._persistence is None:
            return
        await self._persistence.snapshot(
            tenant_id=self._user_id,
            entity_type="improvement",
            entity=improvement,
            version=improvement.updated_at or improvement.created_at or "v1",
        )
        await self._persistence.audit(
            tenant_id=self._user_id,
            actor_id=self._user_id,
            action=action,
            entity_type="improvement",
            entity_id=improvement.id,
            detail={"status": improvement.status, "major_id": improvement.major_id},
        )


    async def delete_by_course(self, course_name: str) -> int:
        """按 course 字段删除关联改进建议（删除课程时联动清理）。"""
        target = (course_name or "").strip()
        target_norm = target.lower()
        if not target_norm:
            return 0
        to_delete = [
            iid
            for iid, imp in self._store.items()
            if (imp.course or "").strip()
            and (
                (imp.course or "").strip() == target
                or target_norm in (imp.course or "").strip().lower()
            )
        ]
        if not to_delete:
            return 0
        for iid in to_delete:
            self._store.pop(iid, None)
        self._schedule_save()
        return len(to_delete)
