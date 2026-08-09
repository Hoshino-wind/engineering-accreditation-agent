# -*- coding: utf-8 -*-
"""PostgreSQL 仓储集成测试。

覆盖：
- 资源上传（add → get_by_id → list_all）
- 候选审核（add_many → update_review_status → list_all 过滤）
- 诊断决策（add → update_decision → list_all 过滤）
- 应用重启后查询恢复（新建 AccreditationStore 实例模拟重启）
- 不同用户数据隔离（tenant_id 隔离）
- 删除操作追加 audit_events、证据记录保留

前置条件：需要可用 PostgreSQL 实例。通过 EA_DATABASE_URL 环境变量配置。
未配置时全部 skip。
"""

from __future__ import annotations

import os
import uuid
from datetime import UTC, datetime

import pytest
from sqlalchemy.ext.asyncio import create_async_engine

from app.infrastructure.accreditation_store import AccreditationStore
from app.infrastructure.postgres_repos import (
    PostgresCandidateRepository,
    PostgresFindingRepository,
    PostgresResourceRepository,
)
from app.modules.diagnostics.domain.finding import (
    DiagnosticEvidenceRef,
    DiagnosticFinding,
    DiagnosticFindingRisk,
    DiagnosticFindingType,
    FindingDecisionStatus,
)
from app.modules.recognition.domain.candidate import (
    CandidateEvidence,
    CandidateReviewStatus,
    RecognitionCandidate,
    RecognitionCandidateRisk,
    RecognitionCandidateType,
)
from app.modules.resources.domain.resource import (
    EvidenceFragment,
    ProcessingStage,
    TeachingResource,
    TeachingResourceSensitivity,
    TeachingResourceStatus,
    TeachingResourceType,
)

# ---------------------------------------------------------------------------
# 环境检测：无 EA_DATABASE_URL 则 skip 全部
# ---------------------------------------------------------------------------

_DATABASE_URL = os.environ.get("EA_DATABASE_URL")
pytestmark = pytest.mark.skipif(
    _DATABASE_URL is None,
    reason="EA_DATABASE_URL 未配置，跳过 PostgreSQL 集成测试",
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
async def store():
    """每次测试创建独立的 engine + schema，测试后销毁。"""
    engine = create_async_engine(_DATABASE_URL, pool_pre_ping=True)
    s = AccreditationStore(engine)
    await s.create_schema()
    yield s
    await s.dispose()


@pytest.fixture
async def clean_store(store):
    """清空 snapshots / evidence / audit 表，保证测试间隔离。"""
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import AsyncSession

    async with AsyncSession(store._engine) as session:
        await session.execute(text("DELETE FROM accreditation_entity_snapshots"))
        await session.execute(text("DELETE FROM evidence_records"))
        await session.execute(text("DELETE FROM audit_events"))
        await session.commit()
    return store


# ---------------------------------------------------------------------------
# 领域对象工厂
# ---------------------------------------------------------------------------

def _make_resource(user_id: str = "user-test-1") -> TeachingResource:
    rid = f"resource-{uuid.uuid4().hex[:12]}"
    return TeachingResource(
        id=rid,
        name="数据结构课程大纲",
        file_name="syllabus_ds.pdf",
        course="数据结构",
        resource_type=TeachingResourceType.SYLLABUS,
        version="v1",
        format="PDF",
        status=TeachingResourceStatus.READY,
        size="1.2 MB",
        sensitivity=TeachingResourceSensitivity.INTERNAL,
        updated_at=datetime.now(UTC).strftime("%Y-%m-%d %H:%M"),
        owner=user_id,
        hash=f"SHA256 {uuid.uuid4().hex}",
        next_action="已就绪",
        source_coverage=85,
        major_id="major-eie",
        evidence_fragments=(
            EvidenceFragment(
                id=f"ev-{rid}",
                coordinate="file",
                type="source-file",
                preview="syllabus_ds.pdf",
                hash=uuid.uuid4().hex,
            ),
        ),
        processing_stages=(
            ProcessingStage(label="安全校验", detail="通过", status="finish"),
        ),
    )


def _make_candidate(
    course: str = "数据结构",
    review_status: CandidateReviewStatus = CandidateReviewStatus.PENDING,
) -> RecognitionCandidate:
    return RecognitionCandidate(
        id=f"candidate-{uuid.uuid4().hex[:12]}",
        title="链表实验支撑工程知识应用",
        course=course,
        candidate_type=RecognitionCandidateType.RELATION,
        confidence=90,
        risk=RecognitionCandidateRisk.HIGH_IMPACT,
        source_node="链表实现",
        relation="支撑",
        target_node="工程知识应用",
        explanation="测试候选",
        processor_version="test-v1",
        generated_at=datetime.now(UTC).strftime("%Y-%m-%d %H:%M"),
        review_status=review_status,
        evidence=(
            CandidateEvidence(
                id=f"cev-{uuid.uuid4().hex[:8]}",
                resource_name="syllabus_ds.pdf",
                resource_version="v1",
                coordinate="file",
                excerpt="链表实验",
                hash=uuid.uuid4().hex,
            ),
        ),
    )


def _make_finding(course: str = "数据结构") -> DiagnosticFinding:
    return DiagnosticFinding(
        id=f"finding-{uuid.uuid4().hex[:12]}",
        title="工程知识应用支撑不足",
        course=course,
        type=DiagnosticFindingType.COVERAGE_GAP,
        risk=DiagnosticFindingRisk.MEDIUM,
        source_node="std-c-01-01",
        target_node="（待补充）",
        relation_label="支撑",
        graph_version="test-v1",
        rule_id="RULE-TEST-001",
        rule_version="v1",
        rule_kind="ai-semantic",
        rule_basis="测试规则",
        rule_rationale="测试诊断",
        rule_run_at=datetime.now(UTC).strftime("%Y-%m-%d %H:%M"),
        major_id="major-eie",
        evidence=(
            DiagnosticEvidenceRef(
                id=f"dev-{uuid.uuid4().hex[:8]}",
                object_name="syllabus_ds.pdf",
                object_version="v1",
                coordinate="file",
                excerpt="缺口",
                hash=uuid.uuid4().hex,
            ),
        ),
    )


# ---------------------------------------------------------------------------
# 测试：资源上传
# ---------------------------------------------------------------------------

async def test_resource_upload_and_query(clean_store):
    """资源上传后可以查询到，payload 中的枚举和嵌套 dataclass 正确重建。"""
    repo = PostgresResourceRepository(
        with_seed=False, user_id="user-test-1", persistence=clean_store
    )
    resource = _make_resource()
    await repo.add(resource)

    # get_by_id
    found = await repo.get_by_id(resource.id)
    assert found is not None
    assert found.id == resource.id
    assert found.name == "数据结构课程大纲"
    assert found.resource_type == TeachingResourceType.SYLLABUS
    assert found.status == TeachingResourceStatus.READY
    assert len(found.evidence_fragments) == 1
    assert found.evidence_fragments[0].coordinate == "file"

    # list_all
    items = await repo.list_all()
    assert len(items) == 1
    assert items[0].id == resource.id

    # major_id 过滤
    items_major = await repo.list_all(major_id="major-eie")
    assert len(items_major) == 1
    items_other = await repo.list_all(major_id="major-other")
    assert len(items_other) == 0


# ---------------------------------------------------------------------------
# 测试：候选审核
# ---------------------------------------------------------------------------

async def test_candidate_review_flow(clean_store):
    """候选 add_many → update_review_status → list_all 过滤。"""
    repo = PostgresCandidateRepository(
        with_seed=False, user_id="user-test-1", persistence=clean_store
    )
    c1 = _make_candidate()
    c2 = _make_candidate(course="操作系统")
    await repo.add_many([c1, c2])

    # 初始全部 pending
    pending = await repo.list_all(review_status="pending")
    assert len(pending) == 2

    # 审核 c1 为 accepted
    updated = await repo.update_review_status(c1.id, CandidateReviewStatus.ACCEPTED)
    assert updated is not None
    assert updated.review_status == CandidateReviewStatus.ACCEPTED

    # 过滤 accepted
    accepted = await repo.list_all(review_status="accepted")
    assert len(accepted) == 1
    assert accepted[0].id == c1.id

    # 过滤 pending
    still_pending = await repo.list_all(review_status="pending")
    assert len(still_pending) == 1
    assert still_pending[0].id == c2.id

    # 按 course 过滤
    ds = await repo.list_all(course="数据结构")
    assert len(ds) == 1


# ---------------------------------------------------------------------------
# 测试：诊断决策
# ---------------------------------------------------------------------------

async def test_finding_decision_flow(clean_store):
    """诊断 add → update_decision → list_all 过滤。"""
    repo = PostgresFindingRepository(
        with_seed=False, user_id="user-test-1", persistence=clean_store
    )
    finding = _make_finding()
    await repo.add(finding)

    # 初始 pending
    pending = await repo.list_all()
    assert len(pending) == 1
    assert pending[0].decision_status == FindingDecisionStatus.PENDING

    # 决策为 confirmed
    updated = await repo.update_decision(finding.id, FindingDecisionStatus.CONFIRMED)
    assert updated is not None
    assert updated.decision_status == FindingDecisionStatus.CONFIRMED

    # 过滤
    confirmed = await repo.list_all()
    assert len(confirmed) == 1
    assert confirmed[0].decision_status == FindingDecisionStatus.CONFIRMED

    # major_id 过滤
    major_filtered = await repo.list_all(major_id="major-eie")
    assert len(major_filtered) == 1
    other = await repo.list_all(major_id="major-cs")
    assert len(other) == 0


# ---------------------------------------------------------------------------
# 测试：应用重启后查询恢复
# ---------------------------------------------------------------------------

async def test_restart_recovery(clean_store):
    """写入数据后，新建 repo 实例（模拟重启），仍能从 PG 恢复。"""
    # 第一次实例写入
    repo1 = PostgresResourceRepository(
        with_seed=False, user_id="user-test-1", persistence=clean_store
    )
    resource = _make_resource()
    await repo1.add(resource)

    # 模拟重启：新的 repo 实例（_store 为空，_loaded_from_pg=False）
    repo2 = PostgresResourceRepository(
        with_seed=False, user_id="user-test-1", persistence=clean_store
    )
    found = await repo2.get_by_id(resource.id)
    assert found is not None
    assert found.id == resource.id
    assert found.name == "数据结构课程大纲"
    assert found.resource_type == TeachingResourceType.SYLLABUS


# ---------------------------------------------------------------------------
# 测试：不同用户数据隔离
# ---------------------------------------------------------------------------

async def test_tenant_isolation(clean_store):
    """user-a 的数据对 user-b 不可见。"""
    repo_a = PostgresResourceRepository(
        with_seed=False, user_id="user-a", persistence=clean_store
    )
    repo_b = PostgresResourceRepository(
        with_seed=False, user_id="user-b", persistence=clean_store
    )

    resource_a = _make_resource(user_id="user-a")
    await repo_a.add(resource_a)

    # user-b 查不到 user-a 的资源
    found_b = await repo_b.get_by_id(resource_a.id)
    assert found_b is None

    items_b = await repo_b.list_all()
    assert len(items_b) == 0

    items_a = await repo_a.list_all()
    assert len(items_a) == 1


# ---------------------------------------------------------------------------
# 测试：删除操作追加 audit_events，证据记录保留
# ---------------------------------------------------------------------------

async def test_delete_preserves_evidence(clean_store):
    """删除资源后：快照被删除，audit_events 追加，evidence_records 保留。"""
    from sqlalchemy import func, select, text
    from sqlalchemy.ext.asyncio import AsyncSession

    from app.infrastructure.accreditation_store import (
        AuditEventRow,
        EntitySnapshotRow,
        EvidenceRecordRow,
    )

    repo = PostgresResourceRepository(
        with_seed=False, user_id="user-test-del", persistence=clean_store
    )
    resource = _make_resource(user_id="user-test-del")
    await repo.add(resource)

    # 确认写入前有快照 + 证据
    async with AsyncSession(clean_store._engine) as session:
        snap_count = await session.scalar(
            select(func.count()).select_from(EntitySnapshotRow).where(
                EntitySnapshotRow.tenant_id == "user-test-del",
                EntitySnapshotRow.entity_type == "resource",
            )
        )
        assert snap_count == 1

        ev_count = await session.scalar(
            select(func.count()).select_from(EvidenceRecordRow).where(
                EvidenceRecordRow.tenant_id == "user-test-del",
            )
        )
        assert ev_count >= 1  # 至少有 source-file 证据

    # 删除
    deleted = await repo.delete(resource.id)
    assert deleted is True

    # 快照已删除
    async with AsyncSession(clean_store._engine) as session:
        snap_count_after = await session.scalar(
            select(func.count()).select_from(EntitySnapshotRow).where(
                EntitySnapshotRow.tenant_id == "user-test-del",
                EntitySnapshotRow.entity_type == "resource",
            )
        )
        assert snap_count_after == 0

        # 证据记录仍然保留（不可物理删除）
        ev_count_after = await session.scalar(
            select(func.count()).select_from(EvidenceRecordRow).where(
                EvidenceRecordRow.tenant_id == "user-test-del",
            )
        )
        assert ev_count_after >= 1

        # audit_events 追加了删除事件
        audit_count = await session.scalar(
            select(func.count()).select_from(AuditEventRow).where(
                AuditEventRow.tenant_id == "user-test-del",
                AuditEventRow.action == "resource.deleted",
            )
        )
        assert audit_count >= 1


# ---------------------------------------------------------------------------
# 测试：候选 delete_by_course 联动清理
# ---------------------------------------------------------------------------

async def test_candidate_delete_by_course(clean_store):
    """delete_by_course 按课程名称包含匹配删除候选。"""
    repo = PostgresCandidateRepository(
        with_seed=False, user_id="user-test-del-c", persistence=clean_store
    )
    c1 = _make_candidate(course="电子电路")
    c2 = _make_candidate(course="电子电路2")
    c3 = _make_candidate(course="数据结构")
    await repo.add_many([c1, c2, c3])

    # 删除「电子电路」相关的候选（包含匹配 c1 和 c2）
    count = await repo.delete_by_course("电子电路")
    assert count == 2

    remaining = await repo.list_all()
    assert len(remaining) == 1
    assert remaining[0].course == "数据结构"
