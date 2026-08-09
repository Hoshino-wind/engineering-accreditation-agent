from dataclasses import replace

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
        new_repo = InMemoryImprovementRepository(with_seed=False, user_id=self._user_id, persistence=self._persistence)
        new_repo._store = {
            iid: replace(imp) for iid, imp in self._store.items()
        }
        return new_repo

    def clone_for_user(self, user_id: str) -> "InMemoryImprovementRepository":
        new_repo = InMemoryImprovementRepository(with_seed=False, user_id=user_id, persistence=self._persistence)
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
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
        updated = replace(existing, status=status, updated_at=now)
        self._store[improvement_id] = updated
        self._schedule_save()
        await self._record(updated, "improvement.status_updated")
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
