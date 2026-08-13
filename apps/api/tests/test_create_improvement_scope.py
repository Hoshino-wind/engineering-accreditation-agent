import asyncio
from datetime import UTC, datetime

from app.modules.improvements.application.create_improvement import CreateImprovement
from app.modules.improvements.infra.memory_store import InMemoryImprovementRepository


def test_create_improvement_uses_active_major_scope() -> None:
    user_id = f"test-improvement-scope-{datetime.now(UTC).strftime('%Y%m%d%H%M%S%f')}"
    repo = InMemoryImprovementRepository(with_seed=False, user_id=user_id)
    use_case = CreateImprovement(repo, active_major_id="major-custom")

    created = asyncio.run(
        use_case.execute(
            title="Add missing lab evidence",
            description="Coverage gap from diagnostics",
            course="Embedded Systems",
            action="Upload lab guide and rerun graph diagnostics",
            owner="Course owner",
            target_code="C-04-01",
            target_name="Experiment design",
        )
    )

    assert created.major_id == "major-custom"
    assert asyncio.run(repo.list_all(major_id="major-custom")) == [created]
    assert asyncio.run(repo.list_all(major_id="major-eie")) == []
