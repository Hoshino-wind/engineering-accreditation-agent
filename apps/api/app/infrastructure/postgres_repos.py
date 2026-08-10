"""PostgreSQL-backed repositories for resource / candidate / finding entities.

These repos function as the primary read source when ``EA_DATABASE_URL`` is
configured.  They extend the existing in-memory repositories and override the
load path: instead of reading from JSON files on disk, they lazily load from
the ``accreditation_entity_snapshots`` table on first read.

Write path is unchanged — the InMemory base class already calls
``AccreditationStore.snapshot()`` / ``evidence()`` / ``audit()`` inside
``_record()``, so every mutation is mirrored to PostgreSQL automatically.

When the database is *not* configured, the original ``InMemory*Repository``
classes (JSON fallback) are used, so existing installations without a database
continue to work.
"""

from __future__ import annotations

from dataclasses import replace
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.accreditation_store import (
    AccreditationStore,
    EntitySnapshotRow,
)
from app.modules.courses.domain.course import Course
from app.modules.diagnostics.domain.finding import DiagnosticFinding
from app.modules.improvements.domain.improvement import Improvement, ImprovementStatus
from app.modules.majors.domain.major import Major
from app.modules.majors.infra.memory_store import _SEED_MAJORS
from app.modules.recognition.domain.candidate import RecognitionCandidate
from app.modules.resources.domain.resource import TeachingResource

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_ENTITY_TYPE_MAP: dict[str, str] = {
    "resources": "resource",
    "candidates": "recognition-candidate",
    "findings": "diagnostic-finding",
    "improvements": "improvement",
}
"""Map from repo_name -> entity_type used in accreditation_entity_snapshots."""


def _repo_name_to_entity_type(repo_name: str) -> str:
    return _ENTITY_TYPE_MAP.get(repo_name, repo_name)


# ---------------------------------------------------------------------------
# Mixin — shared lazy-load logic
# ---------------------------------------------------------------------------


class _PostgresLazyLoadMixin:
    """Mixin that adds lazy PG loading to any InMemory*Repository.

    Subclasses must set ``_repo_name`` and provide ``_from_dict()``.
    """

    _persistence: AccreditationStore | None
    _user_id: str
    _store: dict[str, Any]
    _loaded_from_pg: bool = False

    # ---- override in subclass to return the correct domain type ----
    _entity_type: str = ""

    def _load(self) -> None:
        """Override JSON _load() with a no-op — we load from PG lazily."""
        # The parent __init__ calls _load() which would read from JSON.
        # We skip that entirely.
        pass

    async def _ensure_loaded(self) -> None:
        """Lazy-load from PostgreSQL on first read."""
        if self._loaded_from_pg:
            return
        if self._persistence is None:
            self._loaded_from_pg = True
            return

        entity_type = self._entity_type or _repo_name_to_entity_type(self._repo_name)

        try:
            async with AsyncSession(self._persistence._engine) as session:
                result = await session.execute(
                    select(EntitySnapshotRow).where(
                        EntitySnapshotRow.tenant_id == self._user_id,
                        EntitySnapshotRow.entity_type == entity_type,
                    )
                )
                loaded: dict[str, Any] = {}
                for row in result.scalars():
                    entity = self._from_dict(dict(row.payload))
                    if entity is not None:
                        loaded[entity.id] = entity
                # Only replace if PG actually returned data; otherwise keep
                # whatever is already in memory (e.g. seed data or in-flight writes).
                if loaded:
                    self._store = loaded
        except Exception:
            import logging

            logging.getLogger(__name__).exception(
                "[PG] 加载 %s 数据失败（tenant=%s），回退内存",
                entity_type,
                self._user_id,
            )
        finally:
            self._loaded_from_pg = True


# ---------------------------------------------------------------------------
# Concrete PostgreSQL repositories
# ---------------------------------------------------------------------------


class PostgresResourceRepository(_PostgresLazyLoadMixin):
    """PostgreSQL-backed teaching resource repository."""

    _repo_name = "resources"
    _entity_type = "resource"

    from app.modules.resources.infra.memory_store import InMemoryResourceRepository as _Base

    def __init__(
        self,
        with_seed: bool = False,
        user_id: str | None = None,
        persistence: AccreditationStore | None = None,
    ) -> None:
        self._user_id = user_id or "template"
        self._persistence = persistence
        self._store: dict[str, TeachingResource] = {}
        self._loaded_from_pg = False
        # Inherit _record, _repo_name, _from_dict, etc. from the base class.
        # We use a mixin pattern so we can't easily call super().__init__;
        # instead we manually compose the necessary attributes.
        self._base = self._Base(with_seed=False, user_id=self._user_id, persistence=persistence)

    # Delegate to the InMemory base for the complex methods
    @property
    def _from_dict(self):
        return self._base._from_dict

    # ---- Repository interface ----

    async def list_all(
        self,
        *,
        course: str | None = None,
        status: str | None = None,
        resource_type: str | None = None,
        major_id: str | None = None,
    ) -> list[TeachingResource]:
        await self._ensure_loaded()
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
        await self._ensure_loaded()
        return self._store.get(resource_id)

    async def add(self, resource: TeachingResource) -> TeachingResource:
        self._store[resource.id] = resource
        await self._base._record(resource, "resource.created")
        return resource

    async def update(self, resource: TeachingResource) -> TeachingResource | None:
        if resource.id not in self._store:
            return None
        self._store[resource.id] = resource
        await self._base._record(resource, "resource.updated")
        return resource

    async def delete(self, resource_id: str) -> bool:
        if resource_id not in self._store:
            return False
        del self._store[resource_id]
        if self._persistence is not None:
            await self._persistence.delete_snapshot(
                tenant_id=self._user_id,
                entity_type=self._entity_type,
                entity_id=resource_id,
                actor_id=self._user_id,
            )
        return True

    def clone_for_user(self, user_id: str) -> PostgresResourceRepository:
        new_repo = PostgresResourceRepository(
            with_seed=False, user_id=user_id, persistence=self._persistence
        )
        # Don't copy store — the new user will lazily load from PG
        return new_repo


class PostgresCandidateRepository(_PostgresLazyLoadMixin):
    """PostgreSQL-backed recognition candidate repository."""

    _repo_name = "candidates"
    _entity_type = "recognition-candidate"

    from app.modules.recognition.infra.memory_store import InMemoryCandidateRepository as _Base

    def __init__(
        self,
        with_seed: bool = False,
        user_id: str | None = None,
        persistence: AccreditationStore | None = None,
    ) -> None:
        self._user_id = user_id or "template"
        self._persistence = persistence
        self._store: dict[str, RecognitionCandidate] = {}
        self._loaded_from_pg = False
        self._base = self._Base(with_seed=False, user_id=self._user_id, persistence=persistence)

    @property
    def _from_dict(self):
        return self._base._from_dict

    # ---- Repository interface ----

    async def list_all(
        self,
        *,
        course: str | None = None,
        risk: str | None = None,
        candidate_type: str | None = None,
        review_status: str | None = None,
    ) -> list[RecognitionCandidate]:
        await self._ensure_loaded()
        results = list(self._store.values())
        if course:
            results = [c for c in results if c.course == course]
        if risk:
            results = [c for c in results if c.risk == risk]
        if candidate_type:
            results = [c for c in results if c.candidate_type == candidate_type]
        if review_status:
            results = [c for c in results if c.review_status == review_status]
        return results

    async def get_by_id(self, candidate_id: str) -> RecognitionCandidate | None:
        await self._ensure_loaded()
        return self._store.get(candidate_id)

    async def add(self, candidate: RecognitionCandidate) -> RecognitionCandidate:
        self._store[candidate.id] = candidate
        await self._base._record(candidate, "candidate.created")
        return candidate

    async def add_many(self, candidates: list[RecognitionCandidate]) -> list[RecognitionCandidate]:
        for c in candidates:
            self._store[c.id] = c
        for candidate in candidates:
            await self._base._record(candidate, "candidate.created")
        return candidates

    async def update_review_status(
        self,
        candidate_id: str,
        status: Any,
    ) -> RecognitionCandidate | None:
        existing = self._store.get(candidate_id)
        if existing is None:
            return None
        updated = replace(existing, review_status=status)
        self._store[candidate_id] = updated
        await self._base._record(updated, "candidate.reviewed")
        return updated

    async def delete_by_course(self, course_name: str) -> int:
        target = (course_name or "").strip()
        target_norm = target.lower()
        if not target_norm:
            return 0
        to_delete: list[str] = []
        for cid, c in self._store.items():
            c_name = (c.course or "").strip()
            if not c_name:
                continue
            if c_name == target:
                to_delete.append(cid)
                continue
            if target_norm in c_name.lower():
                to_delete.append(cid)
                continue
        if not to_delete:
            return 0
        for cid in to_delete:
            self._store.pop(cid, None)
            if self._persistence is not None:
                await self._persistence.delete_snapshot(
                    tenant_id=self._user_id,
                    entity_type=self._entity_type,
                    entity_id=cid,
                    actor_id=self._user_id,
                )
        return len(to_delete)

    async def delete_by_source_nodes(self, source_node_ids: set[str]) -> int:
        if not source_node_ids:
            return 0
        to_delete: list[str] = []
        for cid, c in self._store.items():
            if (c.source_node or "") in source_node_ids:
                to_delete.append(cid)
        if not to_delete:
            return 0
        for cid in to_delete:
            self._store.pop(cid, None)
            if self._persistence is not None:
                await self._persistence.delete_snapshot(
                    tenant_id=self._user_id,
                    entity_type=self._entity_type,
                    entity_id=cid,
                    actor_id=self._user_id,
                )
        return len(to_delete)

    def clone_for_user(self, user_id: str) -> PostgresCandidateRepository:
        new_repo = PostgresCandidateRepository(
            with_seed=False, user_id=user_id, persistence=self._persistence
        )
        return new_repo


class PostgresFindingCascadeMixin:
    """PG 版发现仓储级联删除（复用 _store + 快照删除）。"""

    async def _delete_ids(self, ids: list[str]) -> int:
        if not ids:
            return 0
        for fid in ids:
            self._store.pop(fid, None)
        if self._persistence is not None:
            for fid in ids:
                await self._persistence.delete_snapshot(
                    tenant_id=self._user_id,
                    entity_type=self._entity_type,
                    entity_id=fid,
                    actor_id=self._user_id,
                )
        return len(ids)

    async def delete_by_course(self, course_name: str) -> int:
        target = (course_name or "").strip()
        target_norm = target.lower()
        if not target_norm:
            return 0
        ids = [
            fid
            for fid, f in self._store.items()
            if (f.course or "").strip()
            and (
                (f.course or "").strip() == target
                or target_norm in (f.course or "").strip().lower()
            )
        ]
        return await self._delete_ids(ids)

    async def delete_by_nodes(self, node_ids: set[str]) -> int:
        if not node_ids:
            return 0
        ids = [
            fid
            for fid, f in self._store.items()
            if f.source_node in node_ids or f.target_node in node_ids
        ]
        return await self._delete_ids(ids)

    async def delete_by_evidence_object(self, object_name: str) -> int:
        target = (object_name or "").strip()
        if not target:
            return 0
        ids = [
            fid
            for fid, f in self._store.items()
            if any(ev.object_name == target for ev in f.evidence)
        ]
        return await self._delete_ids(ids)


class PostgresFindingRepository(_PostgresLazyLoadMixin, PostgresFindingCascadeMixin):
    """PostgreSQL-backed diagnostic finding repository."""

    _repo_name = "findings"
    _entity_type = "diagnostic-finding"

    from app.modules.diagnostics.infra.memory_store import InMemoryFindingRepository as _Base

    def __init__(
        self,
        with_seed: bool = False,
        user_id: str | None = None,
        persistence: AccreditationStore | None = None,
    ) -> None:
        self._user_id = user_id or "template"
        self._persistence = persistence
        self._store: dict[str, DiagnosticFinding] = {}
        self._loaded_from_pg = False
        self._base = self._Base(with_seed=False, user_id=self._user_id, persistence=persistence)

    @property
    def _from_dict(self):
        return self._base._from_dict

    # ---- Repository interface ----

    async def list_all(
        self,
        *,
        course: str | None = None,
        risk: str | None = None,
        finding_type: str | None = None,
        major_id: str | None = None,
    ) -> list[DiagnosticFinding]:
        await self._ensure_loaded()
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
        await self._ensure_loaded()
        return self._store.get(finding_id)

    async def add(self, finding: DiagnosticFinding) -> DiagnosticFinding:
        self._store[finding.id] = finding
        await self._base._record(finding, "finding.created")
        return finding

    async def add_many(self, findings: list[DiagnosticFinding]) -> list[DiagnosticFinding]:
        for f in findings:
            self._store[f.id] = f
        for finding in findings:
            await self._base._record(finding, "finding.created")
        return findings

    async def update_decision(
        self,
        finding_id: str,
        status: Any,
    ) -> DiagnosticFinding | None:
        existing = self._store.get(finding_id)
        if existing is None:
            return None
        updated = replace(existing, decision_status=status)
        self._store[finding_id] = updated
        await self._base._record(updated, "finding.decided")
        return updated

    def clone_for_user(self, user_id: str) -> PostgresFindingRepository:
        new_repo = PostgresFindingRepository(
            with_seed=False, user_id=user_id, persistence=self._persistence
        )
        return new_repo


class PostgresImprovementRepository(_PostgresLazyLoadMixin):
    _repo_name = "improvements"
    _entity_type = "improvement"

    from app.modules.improvements.infra.memory_store import InMemoryImprovementRepository as _Base

    def __init__(self, with_seed=False, user_id=None, persistence=None) -> None:
        self._user_id = user_id or "template"
        self._persistence = persistence
        self._store: dict[str, Improvement] = {}
        self._loaded_from_pg = False
        self._base = self._Base(False, self._user_id, persistence)

    @property
    def _from_dict(self):
        return self._base._from_dict

    async def list_all(self, *, course=None, status=None, major_id=None) -> list[Improvement]:
        await self._ensure_loaded()
        results = list(self._store.values())
        if course:
            results = [item for item in results if item.course == course]
        if status:
            results = [item for item in results if item.status == status]
        if major_id is not None:
            results = [item for item in results if item.major_id == major_id]
        return results

    async def get_by_id(self, improvement_id: str) -> Improvement | None:
        await self._ensure_loaded()
        return self._store.get(improvement_id)

    async def add(self, improvement: Improvement) -> Improvement:
        self._store[improvement.id] = improvement
        await self._base._record(improvement, "improvement.created")
        return improvement

    async def update_status(
        self,
        improvement_id: str,
        status: ImprovementStatus,
    ) -> Improvement | None:
        await self._ensure_loaded()
        current = self._store.get(improvement_id)
        if current is None:
            return None
        from datetime import UTC, datetime

        now = datetime.now(UTC).strftime("%Y-%m-%d %H:%M")
        closed_at = now if status == ImprovementStatus.CLOSED else None
        updated = replace(current, status=status, updated_at=now, closed_at=closed_at)
        self._store[improvement_id] = updated
        await self._base._record(updated, "improvement.status_updated")
        return updated

    async def update(self, improvement_id: str, changes: dict) -> Improvement | None:
        await self._ensure_loaded()
        current = self._store.get(improvement_id)
        if current is None:
            return None
        from datetime import UTC, datetime

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
            from app.modules.improvements.domain.improvement import ImprovementPriority

            payload["priority"] = ImprovementPriority(payload["priority"])
        if "status" in payload and payload["status"] is not None:
            payload["status"] = ImprovementStatus(payload["status"])
        now = datetime.now(UTC).strftime("%Y-%m-%d %H:%M")
        payload["updated_at"] = now
        if payload.get("status") == ImprovementStatus.CLOSED and current.closed_at is None:
            payload["closed_at"] = now
        elif payload.get("status") and payload.get("status") != ImprovementStatus.CLOSED:
            payload["closed_at"] = None
        updated = replace(current, **payload)
        self._store[improvement_id] = updated
        await self._base._record(updated, "improvement.updated")
        return updated


# ---------------------------------------------------------------------------
# Course / Major repositories
# ---------------------------------------------------------------------------


class PostgresCourseRepository(_PostgresLazyLoadMixin):
    """PostgreSQL-backed course repository."""

    _repo_name = "courses"
    _entity_type = "course"

    def __init__(
        self,
        with_seed: bool = False,
        user_id: str | None = None,
        persistence: AccreditationStore | None = None,
    ) -> None:
        self._user_id = user_id or "template"
        self._persistence = persistence
        self._store: dict[str, Course] = {}
        self._loaded_from_pg = False

    def _from_dict(self, data: dict) -> Course | None:
        try:
            return Course(**data)
        except (TypeError, KeyError):
            return None

    async def _record(self, course: Course, action: str) -> None:
        if self._persistence is None:
            return
        await self._persistence.snapshot(
            tenant_id=self._user_id,
            entity_type=self._entity_type,
            entity=course,
            version="",
        )
        await self._persistence.audit(
            tenant_id=self._user_id,
            actor_id=self._user_id,
            action=action,
            entity_type=self._entity_type,
            entity_id=course.id,
            detail={},
        )

    async def list_all(
        self, *, major_id: str | None = None
    ) -> list[Course]:
        await self._ensure_loaded()
        results = list(self._store.values())
        if major_id is not None:
            results = [c for c in results if c.major_id == major_id]
        return results

    async def get_by_id(self, course_id: str) -> Course | None:
        await self._ensure_loaded()
        return self._store.get(course_id)

    async def add(self, course: Course) -> Course:
        self._store[course.id] = course
        await self._record(course, "course.created")
        return course

    async def delete(self, course_id: str) -> bool:
        if course_id not in self._store:
            return False
        del self._store[course_id]
        if self._persistence is not None:
            await self._persistence.delete_snapshot(
                tenant_id=self._user_id,
                entity_type=self._entity_type,
                entity_id=course_id,
                actor_id=self._user_id,
            )
        return True

    def clone_for_user(self, user_id: str) -> PostgresCourseRepository:
        # PG 模式：新用户懒加载自己的数据，不复制模板
        return PostgresCourseRepository(
            with_seed=False, user_id=user_id, persistence=self._persistence
        )


class PostgresMajorRepository(_PostgresLazyLoadMixin):
    """PostgreSQL-backed major repository.

    与 JSON 模式一致：新租户首次访问且无任何专业时，播种默认专业
    （major-eie），之后以 PG 快照表为主读源。
    """

    _repo_name = "majors"
    _entity_type = "major"

    def __init__(
        self,
        with_seed: bool = False,
        user_id: str | None = None,
        persistence: AccreditationStore | None = None,
    ) -> None:
        self._user_id = user_id or "template"
        self._persistence = persistence
        self._store: dict[str, Major] = {}
        self._loaded_from_pg = False

    def _from_dict(self, data: dict) -> Major | None:
        try:
            return Major(**data)
        except (TypeError, KeyError):
            return None

    async def _ensure_loaded(self) -> None:
        await super()._ensure_loaded()
        # 新租户首次访问且无任何专业：播种默认专业（与 JSON 模式 seed 一致）
        if self._store or self._persistence is None or self._user_id == "template":
            return
        for major in _SEED_MAJORS:
            self._store[major.id] = major
            await self._persistence.snapshot(
                tenant_id=self._user_id,
                entity_type=self._entity_type,
                entity=major,
                version="",
            )

    async def list_all(self) -> list[Major]:
        await self._ensure_loaded()
        return list(self._store.values())

    async def get_by_id(self, major_id: str) -> Major | None:
        await self._ensure_loaded()
        return self._store.get(major_id)

    async def add(self, major: Major) -> Major:
        self._store[major.id] = major
        if self._persistence is not None:
            await self._persistence.snapshot(
                tenant_id=self._user_id,
                entity_type=self._entity_type,
                entity=major,
                version="",
            )
            await self._persistence.audit(
                tenant_id=self._user_id,
                actor_id=self._user_id,
                action="major.created",
                entity_type=self._entity_type,
                entity_id=major.id,
                detail={},
            )
        return major

    async def delete(self, major_id: str) -> bool:
        if major_id not in self._store:
            return False
        del self._store[major_id]
        if self._persistence is not None:
            await self._persistence.delete_snapshot(
                tenant_id=self._user_id,
                entity_type=self._entity_type,
                entity_id=major_id,
                actor_id=self._user_id,
            )
        return True

    def clone_for_user(self, user_id: str) -> PostgresMajorRepository:
        return PostgresMajorRepository(
            with_seed=False, user_id=user_id, persistence=self._persistence
        )

