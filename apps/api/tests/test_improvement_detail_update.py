import asyncio
from datetime import UTC, datetime

from app.modules.improvements.application.update_improvement import UpdateImprovement
from app.modules.improvements.application.delete_improvement import DeleteImprovement
from app.modules.improvements.domain.improvement import (
    Improvement,
    ImprovementPriority,
    ImprovementStatus,
)
from app.modules.improvements.infra.memory_store import InMemoryImprovementRepository


def _improvement() -> Improvement:
    return Improvement(
        id="imp-detail-1",
        title="补充实验支撑",
        description="诊断发现转入",
        course="数据结构",
        finding_id="finding-1",
        target_code="C-01-01",
        target_name="工程知识应用",
        root_cause="支撑证据不足",
        action="补充实验指导书",
        expected_effect="支撑关系可复核",
        owner="张老师",
        deadline=None,
        source_module="M5",
        source_label="图谱诊断",
        verification_method="重新运行诊断",
        status=ImprovementStatus.OPEN,
        priority=ImprovementPriority.MEDIUM,
        created_at="2026-08-10 10:00",
        updated_at="2026-08-10 10:00",
    )


def test_update_improvement_detail_fields() -> None:
    user_id = f"test-improvement-update-{datetime.now(UTC).strftime('%Y%m%d%H%M%S%f')}"
    repo = InMemoryImprovementRepository(with_seed=False, user_id=user_id)
    repo._store = {"imp-detail-1": _improvement()}
    use_case = UpdateImprovement(repo)

    updated = asyncio.run(
        use_case.execute_changes(
            "imp-detail-1",
            {
                "owner": "李老师",
                "verification_method": "上传修订版实验指导书后重新运行 M5/M6",
                "completion_summary": "已补充链表实验评分细则",
                "evidence_uri": "materials/lab-guide-v2.pdf",
                "reevaluation_result": 0.86,
                "status": "closed",
            },
        )
    )

    assert updated is not None
    assert updated.owner == "李老师"
    assert updated.verification_method.startswith("上传修订版")
    assert updated.completion_summary == "已补充链表实验评分细则"
    assert updated.evidence_uri == "materials/lab-guide-v2.pdf"
    assert updated.reevaluation_result == 0.86
    assert updated.status == ImprovementStatus.CLOSED
    assert updated.closed_at is not None


def test_delete_improvement_removes_item() -> None:
    user_id = f"test-improvement-delete-{datetime.now(UTC).strftime('%Y%m%d%H%M%S%f')}"
    repo = InMemoryImprovementRepository(with_seed=False, user_id=user_id)
    repo._store = {"imp-detail-1": _improvement()}
    use_case = DeleteImprovement(repo)

    deleted = asyncio.run(use_case.execute("imp-detail-1"))

    assert deleted is True
    assert asyncio.run(repo.get_by_id("imp-detail-1")) is None
    assert asyncio.run(use_case.execute("missing")) is False
