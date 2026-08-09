"""持久化恢复测试（第 2 步，无需 PostgreSQL）：

覆盖当前默认主存储路径（JSON 落盘）的「重启恢复」：
- 资源仓储：写入 → 新实例（模拟服务重启）→ 数据完整恢复
- 候选仓储：写入 → 新实例 → 审核状态等字段完整恢复
- 用户隔离：不同 user_id 各自独立文件，恢复互不干扰
"""
import asyncio
import time
from datetime import UTC, datetime
from pathlib import Path

import pytest

from app.modules.recognition.domain.candidate import (
    CandidateEvidence,
    CandidateReviewStatus,
    RecognitionCandidate,
    RecognitionCandidateRisk,
    RecognitionCandidateType,
)
from app.modules.recognition.infra.memory_store import InMemoryCandidateRepository
from app.modules.resources.domain.resource import (
    EvidenceFragment,
    ProcessingStage,
    TeachingResource,
    TeachingResourceSensitivity,
    TeachingResourceStatus,
    TeachingResourceType,
)
from app.modules.resources.infra.memory_store import InMemoryResourceRepository


@pytest.fixture(autouse=True)
def _isolate_json_data(monkeypatch, tmp_path) -> None:
    """把 JSON 落盘目录指向临时目录，避免污染 apps/api/data/。"""
    import app.core.json_persistence as jp

    monkeypatch.setattr(jp, "_DATA_DIR", Path(tmp_path))
    yield


def _resource(resource_id: str, owner: str) -> TeachingResource:
    return TeachingResource(
        id=resource_id,
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
        owner=owner,
        hash=f"SHA256 {resource_id}",
        next_action="已就绪",
        source_coverage=85,
        major_id="major-eie",
        evidence_fragments=(
            EvidenceFragment(
                id=f"ev-{resource_id}",
                coordinate="file",
                type="source-file",
                preview="syllabus_ds.pdf",
                hash="abc123",
            ),
        ),
        processing_stages=(
            ProcessingStage(label="安全校验", detail="通过", status="finish"),
        ),
    )


def _candidate(candidate_id: str) -> RecognitionCandidate:
    return RecognitionCandidate(
        id=candidate_id,
        title="链表实验支撑工程知识应用",
        course="数据结构",
        candidate_type=RecognitionCandidateType.RELATION,
        confidence=90,
        risk=RecognitionCandidateRisk.HIGH_IMPACT,
        source_node="链表实现",
        relation="支撑",
        target_node="工程知识应用",
        explanation="测试候选",
        processor_version="test-v1",
        generated_at=datetime.now(UTC).strftime("%Y-%m-%d %H:%M"),
        review_status=CandidateReviewStatus.ACCEPTED,
        evidence=(
            CandidateEvidence(
                id=f"cev-{candidate_id}",
                resource_name="syllabus_ds.pdf",
                resource_version="v1",
                coordinate="file",
                excerpt="链表实验",
                hash="abc123",
            ),
        ),
    )


def test_resource_repository_recovers_after_restart() -> None:
    # 第一次启动：写入（JSON 持久化为 50ms 防抖，等待落盘后再模拟重启）
    repo = InMemoryResourceRepository(with_seed=False, user_id="user-a")
    asyncio.run(repo.add(_resource("resource-1", "user-a")))
    time.sleep(0.15)

    # 模拟重启：全新实例从 JSON 恢复
    restarted = InMemoryResourceRepository(with_seed=False, user_id="user-a")
    loaded = asyncio.run(restarted.get_by_id("resource-1"))

    assert loaded is not None
    assert loaded.name == "数据结构课程大纲"
    assert loaded.status == TeachingResourceStatus.READY
    assert loaded.owner == "user-a"
    assert loaded.evidence_fragments[0].coordinate == "file"


def test_candidate_repository_recovers_review_status_after_restart() -> None:
    repo = InMemoryCandidateRepository(with_seed=False, user_id="user-a")
    asyncio.run(repo.add(_candidate("candidate-1")))
    time.sleep(0.15)

    restarted = InMemoryCandidateRepository(with_seed=False, user_id="user-a")
    loaded = asyncio.run(restarted.get_by_id("candidate-1"))

    assert loaded is not None
    assert loaded.review_status == CandidateReviewStatus.ACCEPTED
    assert loaded.source_node == "链表实现"
    assert loaded.evidence[0].excerpt == "链表实验"


def test_users_data_is_isolated_across_restart() -> None:
    repo_a = InMemoryResourceRepository(with_seed=False, user_id="user-a")
    repo_b = InMemoryResourceRepository(with_seed=False, user_id="user-b")
    asyncio.run(repo_a.add(_resource("resource-a-1", "user-a")))
    asyncio.run(repo_b.add(_resource("resource-b-1", "user-b")))
    time.sleep(0.15)

    # 重启后 A 看不到 B 的数据，反之亦然
    restarted_a = InMemoryResourceRepository(with_seed=False, user_id="user-a")
    restarted_b = InMemoryResourceRepository(with_seed=False, user_id="user-b")

    assert asyncio.run(restarted_a.get_by_id("resource-a-1")) is not None
    assert asyncio.run(restarted_a.get_by_id("resource-b-1")) is None
    assert asyncio.run(restarted_b.get_by_id("resource-b-1")) is not None
    assert asyncio.run(restarted_b.get_by_id("resource-a-1")) is None


def test_corrupted_json_falls_back_to_empty_store_without_crash() -> None:
    import app.core.json_persistence as jp

    target = jp._file_for("resources", "user-c")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text("{ not valid json !!", encoding="utf-8")

    repo = InMemoryResourceRepository(with_seed=False, user_id="user-c")
    assert asyncio.run(repo.list_all()) == []
