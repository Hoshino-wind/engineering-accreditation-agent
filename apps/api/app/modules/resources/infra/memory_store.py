from dataclasses import replace

from app.core.json_persistence import JsonPersistenceMixin
from app.infrastructure.accreditation_store import AccreditationStore
from app.modules.resources.domain.resource import (
    EvidenceFragment,
    ProcessingStage,
    SuggestedCourse,
    TeachingResource,
    TeachingResourceSensitivity,
    TeachingResourceStatus,
    TeachingResourceType,
)

# 无预置教学材料：用户从零上传。
_SEED_RESOURCES: list[TeachingResource] = []


class InMemoryResourceRepository(JsonPersistenceMixin):
    _repo_name = "resources"

    def __init__(
        self,
        with_seed: bool = True,
        user_id: str | None = None,
        persistence: AccreditationStore | None = None,
    ) -> None:
        self._user_id = user_id or "template"
        self._persistence = persistence
        if with_seed:
            self._store: dict[str, TeachingResource] = {
                r.id: r for r in _SEED_RESOURCES
            }
        else:
            self._store = {}
        self._load()

    def clone(self) -> "InMemoryResourceRepository":
        new_repo = InMemoryResourceRepository(
            with_seed=False, user_id=self._user_id, persistence=self._persistence
        )
        new_repo._store = {
            rid: replace(resource) for rid, resource in self._store.items()
        }
        return new_repo

    def clone_for_user(self, user_id: str) -> "InMemoryResourceRepository":
        new_repo = InMemoryResourceRepository(
            with_seed=False, user_id=user_id, persistence=self._persistence
        )
        if not new_repo._store:
            new_repo._store = {
                rid: replace(resource) for rid, resource in self._store.items()
            }
        return new_repo

    def _from_dict(self, data: dict) -> TeachingResource | None:
        try:
            kwargs = dict(data)
            # 枚举恢复
            kwargs["resource_type"] = TeachingResourceType(kwargs["resource_type"])
            kwargs["status"] = TeachingResourceStatus(kwargs["status"])
            kwargs["sensitivity"] = TeachingResourceSensitivity(kwargs["sensitivity"])
            # 嵌套 dataclass 恢复
            kwargs["evidence_fragments"] = tuple(
                EvidenceFragment(**ef) for ef in kwargs.get("evidence_fragments", [])
            )
            kwargs["processing_stages"] = tuple(
                ProcessingStage(**ps) for ps in kwargs.get("processing_stages", [])
            )
            sc = kwargs.get("suggested_course")
            if sc:
                kwargs["suggested_course"] = SuggestedCourse(**sc)
            else:
                kwargs["suggested_course"] = None
            kwargs.setdefault("version_group_id", kwargs.get("id", ""))
            kwargs.setdefault("supersedes_id", None)
            kwargs.setdefault("is_current_version", True)
            return TeachingResource(**kwargs)
        except (TypeError, KeyError, ValueError):
            return None

    async def list_all(
        self,
        *,
        course: str | None = None,
        status: str | None = None,
        resource_type: str | None = None,
        major_id: str | None = None,
    ) -> list[TeachingResource]:
        results = list(self._store.values())
        if course:
            results = [r for r in results if r.course == course]
        if status:
            results = [r for r in results if r.status == status]
        if resource_type:
            results = [r for r in results if r.resource_type == resource_type]
        if major_id is not None:
            results = [r for r in results if r.major_id == major_id]
        return results

    async def get_by_id(self, resource_id: str) -> TeachingResource | None:
        return self._store.get(resource_id)

    async def add(self, resource: TeachingResource) -> TeachingResource:
        self._store[resource.id] = resource
        self._schedule_save()
        await self._record(resource, "resource.created")
        return resource

    async def update(self, resource: TeachingResource) -> TeachingResource | None:
        if resource.id not in self._store:
            return None
        self._store[resource.id] = resource
        self._schedule_save()
        await self._record(resource, "resource.updated")
        return resource

    async def delete(self, resource_id: str) -> bool:
        if resource_id not in self._store:
            return False
        del self._store[resource_id]
        self._schedule_save()
        if self._persistence is not None:
            await self._persistence.audit(
                tenant_id=self._user_id,
                actor_id=self._user_id,
                action="resource.deleted",
                entity_type="resource",
                entity_id=resource_id,
                detail={},
            )
        return True

    async def _record(self, resource: TeachingResource, action: str) -> None:
        if self._persistence is None:
            return
        await self._persistence.snapshot(
            tenant_id=self._user_id,
            entity_type="resource",
            entity=resource,
            version=resource.version,
        )
        for fragment in resource.evidence_fragments:
            await self._persistence.evidence(
                tenant_id=self._user_id,
                evidence_id=fragment.id,
                subject_type="resource",
                subject_id=resource.id,
                source_name=resource.file_name,
                source_version=resource.version,
                coordinate=fragment.coordinate,
                fragment_type=fragment.type,
                excerpt=fragment.preview,
                content_hash=fragment.hash,
            )
        await self._persistence.audit(
            tenant_id=self._user_id,
            actor_id=self._user_id,
            action=action,
            entity_type="resource",
            entity_id=resource.id,
            detail={"version": resource.version},
        )
