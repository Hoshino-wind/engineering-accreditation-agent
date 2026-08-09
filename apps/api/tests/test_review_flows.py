"""复核决策流测试（第 2 步）：

- 识别候选审核：accept / reject / modify 状态流转；无效决策显式报错（不再静默接受）
- 诊断发现处置：confirm / dismiss / convert 状态流转；无效决策显式报错（不再静默确认）
"""
import asyncio
from datetime import UTC, datetime

import pytest

from app.modules.diagnostics.application.decide_finding import DecideFinding
from app.modules.diagnostics.domain.finding import (
    DiagnosticEvidenceRef,
    DiagnosticFinding,
    DiagnosticFindingRisk,
    DiagnosticFindingType,
    FindingDecisionStatus,
)
from app.modules.diagnostics.infra.memory_store import InMemoryFindingRepository
from app.modules.recognition.application.review_candidate import ReviewCandidate
from app.modules.recognition.domain.candidate import (
    CandidateEvidence,
    CandidateReviewStatus,
    RecognitionCandidate,
    RecognitionCandidateRisk,
    RecognitionCandidateType,
)
from app.modules.recognition.infra.memory_store import InMemoryCandidateRepository


def _candidate(
    review_status: CandidateReviewStatus = CandidateReviewStatus.PENDING,
) -> RecognitionCandidate:
    return RecognitionCandidate(
        id="candidate-review-1",
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
        review_status=review_status,
        evidence=(
            CandidateEvidence(
                id="cev-1",
                resource_name="syllabus_ds.pdf",
                resource_version="v1",
                coordinate="file",
                excerpt="链表实验",
                hash="abc123",
            ),
        ),
    )


def _finding(
    decision: FindingDecisionStatus = FindingDecisionStatus.PENDING,
) -> DiagnosticFinding:
    return DiagnosticFinding(
        id="finding-review-1",
        title="课程目标与指标点覆盖缺口",
        course="数据结构",
        type=DiagnosticFindingType.COVERAGE_GAP,
        risk=DiagnosticFindingRisk.HIGH,
        source_node="链表实现",
        target_node="能力指标 C-01",
        relation_label="支撑",
        graph_version="v1",
        rule_id="rule-min-strength",
        rule_version="rules-v1",
        rule_kind="coverage-gap",
        rule_basis="支撑强度不足",
        rule_rationale="该能力指标已审核支撑总强度低于阈值",
        rule_run_at="2026-08-01 10:00",
        decision_status=decision,
        impact_course_objectives=1,
        impact_ability_nodes=1,
        impact_evaluation_inputs=0,
        suggested_destination="improvements",
        evidence=(
            DiagnosticEvidenceRef(
                id="dev-1",
                object_name="syllabus_ds.pdf",
                object_version="v1",
                coordinate="file",
                excerpt="链表实验",
                hash="abc123",
            ),
        ),
    )


class TestCandidateReviewFlow:
    def test_accept_reject_modify_status_transitions(self) -> None:
        repo = InMemoryCandidateRepository(with_seed=False, user_id="t")
        repo._store = {_candidate().id: _candidate()}
        use_case = ReviewCandidate(repo)

        accepted = asyncio.run(use_case.execute("candidate-review-1", "accept"))
        assert accepted is not None
        assert accepted.review_status == CandidateReviewStatus.ACCEPTED

        rejected = asyncio.run(use_case.execute("candidate-review-1", "reject"))
        assert rejected is not None
        assert rejected.review_status == CandidateReviewStatus.REJECTED

        modified = asyncio.run(use_case.execute("candidate-review-1", "modify"))
        assert modified is not None
        assert modified.review_status == CandidateReviewStatus.MODIFIED

    def test_unknown_decision_raises_instead_of_silent_accept(self) -> None:
        repo = InMemoryCandidateRepository(with_seed=False, user_id="t")
        repo._store = {_candidate().id: _candidate()}
        use_case = ReviewCandidate(repo)

        with pytest.raises(ValueError, match="无效的审核决策"):
            asyncio.run(use_case.execute("candidate-review-1", "hack"))

        # 决策失败不得改变原状态
        stored = repo._store["candidate-review-1"]
        assert stored.review_status == CandidateReviewStatus.PENDING

    def test_review_missing_candidate_returns_none(self) -> None:
        repo = InMemoryCandidateRepository(with_seed=False, user_id="t")
        use_case = ReviewCandidate(repo)
        assert asyncio.run(use_case.execute("candidate-missing", "accept")) is None


class TestFindingDecisionFlow:
    def test_confirm_dismiss_convert_status_transitions(self) -> None:
        repo = InMemoryFindingRepository(with_seed=False, user_id="t")
        repo._store = {_finding().id: _finding()}
        use_case = DecideFinding(repo)

        confirmed = asyncio.run(use_case.execute("finding-review-1", "confirm"))
        assert confirmed is not None
        assert confirmed.decision_status == FindingDecisionStatus.CONFIRMED

        dismissed = asyncio.run(use_case.execute("finding-review-1", "dismiss"))
        assert dismissed is not None
        assert dismissed.decision_status == FindingDecisionStatus.DISMISSED

        converted = asyncio.run(use_case.execute("finding-review-1", "convert"))
        assert converted is not None
        assert converted.decision_status == FindingDecisionStatus.CONVERTED

    def test_unknown_decision_raises_instead_of_silent_confirm(self) -> None:
        repo = InMemoryFindingRepository(with_seed=False, user_id="t")
        repo._store = {_finding().id: _finding()}
        use_case = DecideFinding(repo)

        with pytest.raises(ValueError, match="无效的处置决策"):
            asyncio.run(use_case.execute("finding-review-1", "hack"))

        stored = repo._store["finding-review-1"]
        assert stored.decision_status == FindingDecisionStatus.PENDING

    def test_decide_missing_finding_returns_none(self) -> None:
        repo = InMemoryFindingRepository(with_seed=False, user_id="t")
        use_case = DecideFinding(repo)
        assert asyncio.run(use_case.execute("finding-missing", "confirm")) is None
