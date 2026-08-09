"""Course / Major 仓储的 PostgreSQL 主读测试（第 3 步）。

两层：
- 无数据库依赖的仓储逻辑测试（FakePersistence）：写路径 snapshot/audit、
  删除 delete_snapshot、新租户 majors 播种；
- 需要 EA_DATABASE_URL 的集成测试：模拟重启恢复、删除审计（未配置时 skip）。
"""
from __future__ import annotations

import asyncio
import os
import uuid

import pytest
from app.infrastructure.postgres_repos import (
    PostgresCourseRepository,
    PostgresMajorRepository,
)
from app.modules.courses.domain.course import Course
from app.modules.majors.domain.major import Major

# ============================================================================
# 无数据库依赖：仓储逻辑（FakePersistence）
# ============================================================================


class FakePersistence:
    """实现 AccreditationStore 写接口的假对象，用于验证调用参数。"""

    def __init__(self) -> None:
        self.snapshots: list[tuple] = []
        self.audits: list[tuple] = []
        self.deleted: list[tuple] = []
        self._engine = None  # 触发 mixin 的 PG 查询回退路径

    async def snapshot(self, *, tenant_id, entity_type, entity, version) -> None:
        self.snapshots.append((tenant_id, entity_type, entity, version))

    async def audit(self, *, tenant_id, actor_id, action, entity_type, entity_id, detail) -> None:
        self.audits.append((action, entity_type, entity_id))

    async def delete_snapshot(self, *, tenant_id, entity_type, entity_id, actor_id) -> None:
        self.deleted.append((entity_type, entity_id))


def _course(course_id: str | None = None) -> Course:
    return Course(
        id=course_id or f"course-{uuid.uuid4().hex[:8]}",
        code="B020012005",
        name="单片机基础",
        credits=2.5,
        semester="2025春",
        major_id="major-eie",
        description="测试课程",
    )


def _major(major_id: str = "major-custom") -> Major:
    return Major(
        id=major_id,
        code="080701",
        name="自定义专业",
        school_name="示例大学",
        standard_version="2024",
        description="测试专业",
    )


class TestCourseRepoLogic:
    def test_add_writes_snapshot_and_audit(self) -> None:
        fake = FakePersistence()
        repo = PostgresCourseRepository(
            with_seed=False, user_id="user-1", persistence=fake
        )
        course = _course()

        stored = asyncio.run(repo.add(course))

        assert stored.id == course.id
        assert repo._store[course.id].name == "单片机基础"
        assert fake.snapshots == [("user-1", "course", course, "")]
        assert ("course.created", "course", course.id) in fake.audits

    def test_delete_calls_delete_snapshot(self) -> None:
        fake = FakePersistence()
        repo = PostgresCourseRepository(
            with_seed=False, user_id="user-1", persistence=fake
        )
        course = _course()
        asyncio.run(repo.add(course))

        removed = asyncio.run(repo.delete(course.id))

        assert removed is True
        assert fake.deleted == [("course", course.id)]
        assert asyncio.run(repo.delete(course.id)) is False  # 幂等

    def test_list_all_filters_by_major(self) -> None:
        fake = FakePersistence()
        repo = PostgresCourseRepository(
            with_seed=False, user_id="user-1", persistence=fake
        )
        asyncio.run(repo.add(_course("course-a")))
        asyncio.run(
            repo.add(
                Course(
                    id="course-b",
                    code="X",
                    name="另一专业课程",
                    major_id="major-other",
                )
            )
        )

        result = asyncio.run(repo.list_all(major_id="major-eie"))
        assert [c.id for c in result] == ["course-a"]


class TestMajorRepoLogic:
    def test_new_tenant_seeds_default_major(self) -> None:
        fake = FakePersistence()
        repo = PostgresMajorRepository(
            with_seed=False, user_id="user-fresh", persistence=fake
        )

        majors = asyncio.run(repo.list_all())

        assert any(m.id == "major-eie" for m in majors)
        assert any(
            tenant == "user-fresh" and entity_type == "major"
            for tenant, entity_type, _entity, _version in fake.snapshots
        )

    def test_seed_skipped_when_tenant_already_has_data(self) -> None:
        fake = FakePersistence()
        repo = PostgresMajorRepository(
            with_seed=False, user_id="user-existing", persistence=fake
        )
        # 预置已有专业（模拟 PG 中已有数据）
        repo._store["major-custom"] = _major()
        repo._loaded_from_pg = True

        majors = asyncio.run(repo.list_all())

        assert [m.id for m in majors] == ["major-custom"]

    def test_template_tenant_never_seeds(self) -> None:
        fake = FakePersistence()
        repo = PostgresMajorRepository(
            with_seed=False, user_id="template", persistence=fake
        )

        majors = asyncio.run(repo.list_all())

        assert majors == []
        assert fake.snapshots == []

    def test_add_and_delete_major(self) -> None:
        fake = FakePersistence()
        repo = PostgresMajorRepository(
            with_seed=False, user_id="user-1", persistence=fake
        )
        major = _major()

        asyncio.run(repo.add(major))
        assert repo._store[major.id].name == "自定义专业"
        assert ("major.created", "major", major.id) in fake.audits

        assert asyncio.run(repo.delete(major.id)) is True
        assert fake.deleted == [("major", major.id)]


# ============================================================================
# PostgreSQL 集成测试（需要 EA_DATABASE_URL，未配置时 skip）
# ============================================================================

_DATABASE_URL = os.environ.get("EA_DATABASE_URL")


@pytest.mark.skipif(
    _DATABASE_URL is None,
    reason="EA_DATABASE_URL 未配置，跳过 PostgreSQL 集成测试",
)
class TestPostgresIntegration:
    @pytest.fixture
    async def store(self):
        from app.infrastructure.accreditation_store import AccreditationStore
        from sqlalchemy.ext.asyncio import create_async_engine

        engine = create_async_engine(_DATABASE_URL, pool_pre_ping=True)
        s = AccreditationStore(engine)
        await s.create_schema()
        yield s
        await s.dispose()

    @pytest.fixture
    async def clean_store(self, store):
        from sqlalchemy import text
        from sqlalchemy.ext.asyncio import AsyncSession

        async with AsyncSession(store._engine) as session:
            await session.execute(text("DELETE FROM accreditation_entity_snapshots"))
            await session.execute(text("DELETE FROM evidence_records"))
            await session.execute(text("DELETE FROM audit_events"))
            await session.commit()
        return store

    async def test_course_roundtrip_survives_restart(self, clean_store) -> None:
        repo = PostgresCourseRepository(
            with_seed=False, user_id="user-integration", persistence=clean_store
        )
        await repo.add(_course("course-integration"))

        # 模拟重启：新实例从 PG 懒加载
        restarted = PostgresCourseRepository(
            with_seed=False, user_id="user-integration", persistence=clean_store
        )
        loaded = await restarted.get_by_id("course-integration")

        assert loaded is not None
        assert loaded.name == "单片机基础"
        assert loaded.credits == 2.5

    async def test_major_seed_persisted_and_recovered(self, clean_store) -> None:
        repo = PostgresMajorRepository(
            with_seed=False, user_id="user-integration", persistence=clean_store
        )
        majors = await repo.list_all()
        assert any(m.id == "major-eie" for m in majors)

        # 重启后仍可读到已播种的专业，且不会重复播种
        restarted = PostgresMajorRepository(
            with_seed=False, user_id="user-integration", persistence=clean_store
        )
        again = await restarted.list_all()
        assert [m.id for m in again] == ["major-eie"]

    async def test_course_delete_appends_audit(self, clean_store) -> None:
        repo = PostgresCourseRepository(
            with_seed=False, user_id="user-integration", persistence=clean_store
        )
        await repo.add(_course("course-to-delete"))
        assert await repo.delete("course-to-delete") is True

        events = await clean_store.list_audit_events(
            tenant_id="user-integration",
            entity_type="course",
            entity_id="course-to-delete",
        )
        actions = [e["action"] for e in events]
        assert "course.deleted" in actions

    async def test_majors_are_tenant_isolated(self, clean_store) -> None:
        repo_a = PostgresMajorRepository(
            with_seed=False, user_id="user-iso-a", persistence=clean_store
        )
        repo_b = PostgresMajorRepository(
            with_seed=False, user_id="user-iso-b", persistence=clean_store
        )
        await repo_a.list_all()  # 触发 A 播种
        await repo_b.add(_major("major-only-b"))

        # B 不应看到 A 的播种数据，A 不应看到 B 的自建专业
        b_majors = await repo_b.list_all()
        assert [m.id for m in b_majors] == ["major-only-b"]
        a_majors = await repo_a.list_all()
        assert [m.id for m in a_majors] == ["major-eie"]
