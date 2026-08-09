"""删除级联测试（Step10）：删课程/材料后关联数据清理。"""
from __future__ import annotations

import asyncio

from app.modules.courses.application.delete_course import DeleteCourse
from app.modules.courses.domain.course import Course
from app.modules.courses.infra.memory_store import InMemoryCourseRepository
from app.modules.diagnostics.domain.finding import (
    DiagnosticEvidenceRef,
    DiagnosticFinding,
    DiagnosticFindingRisk,
    DiagnosticFindingType,
)
from app.modules.diagnostics.infra.memory_store import InMemoryFindingRepository
from app.modules.improvements.domain.improvement import Improvement, ImprovementStatus
from app.modules.improvements.infra.memory_store import InMemoryImprovementRepository
from app.modules.recognition.domain.candidate import (
    CandidateEvidence,
    RecognitionCandidate,
    RecognitionCandidateRisk,
    RecognitionCandidateType,
)
from app.modules.recognition.infra.memory_store import InMemoryCandidateRepository
from app.modules.resources.application.delete_resource import DeleteResource
from app.modules.resources.domain.resource import (
    TeachingResource,
    TeachingResourceSensitivity,
    TeachingResourceStatus,
    TeachingResourceType,
)
from app.modules.resources.infra.memory_store import InMemoryResourceRepository


class _FakeGraphProjection:
    """模拟图谱清理：返回被删节点集合。"""

    def __init__(self, removed: set[str]) -> None:
        self._removed = removed

    async def remove_course(self, course: Course) -> set[str]:
        return self._removed


def _course() -> Course:
    return Course(id="course-1", code="B020012005", name="单片机基础", major_id="major-eie")


def _finding(course: str = "单片机基础", source: str = "EXP-MCU-01") -> DiagnosticFinding:
    return DiagnosticFinding(
        id="finding-1",
        title="覆盖缺口",
        course=course,
        type=DiagnosticFindingType.COVERAGE_GAP,
        risk=DiagnosticFindingRisk.HIGH,
        source_node=source,
        target_node="std-c-01-01",
        relation_label="支撑",
        graph_version="v1",
        rule_id="r1",
        rule_version="rules-v1",
        rule_kind="coverage-gap",
        rule_basis="b",
        rule_rationale="r",
        rule_run_at="2026-08-01 10:00",
        evidence=(
            DiagnosticEvidenceRef(
                id="ev-1", object_name="单片机实验指导书.pdf", object_version="v1",
                coordinate="file", excerpt="x", hash="h",
            ),
        ),
    )


def _improvement() -> Improvement:
    return Improvement(
        id="imp-1",
        title="补充实验材料",
        description="d",
        course="单片机基础",
        action="补充",
        owner="teacher",
        status=ImprovementStatus.OPEN,
        finding_id="finding-1",
        target_code="C-01-01",
        target_name="工程知识应用",
        root_cause="材料不足",
        expected_effect="覆盖提升",
        deadline="2026-09-01",
    )


def _candidate() -> RecognitionCandidate:
    return RecognitionCandidate(
        id="cand-1",
        title="GPIO实验支撑C-01-01",
        course="单片机基础",
        candidate_type=RecognitionCandidateType.RELATION,
        confidence=90,
        risk=RecognitionCandidateRisk.HIGH_IMPACT,
        source_node="GPIO实验",
        relation="支撑",
        target_node="C-01-01",
        explanation="e",
        processor_version="v1",
        generated_at="2026-08-01 10:00",
        evidence=(
            CandidateEvidence(
                id="cev-1", resource_name="单片机实验指导书.pdf", resource_version="v1",
                coordinate="file", excerpt="x", hash="h",
            ),
        ),
    )


def _resource() -> TeachingResource:
    return TeachingResource(
        id="res-1",
        name="单片机实验指导书",
        file_name="单片机实验指导书.pdf",
        course="单片机基础",
        resource_type=TeachingResourceType.LAB_GUIDE,
        version="v1",
        format="PDF",
        status=TeachingResourceStatus.READY,
        size="1MB",
        sensitivity=TeachingResourceSensitivity.INTERNAL,
        updated_at="2026-01-01",
        owner="user-1",
        hash="h",
        next_action="",
        source_coverage=80,
        major_id="major-eie",
    )


def test_delete_course_cascades_findings_and_improvements() -> None:
    courses = InMemoryCourseRepository(with_seed=False, user_id="t")
    courses._store = {"course-1": _course()}
    findings = InMemoryFindingRepository(with_seed=False, user_id="t")
    findings._store = {"finding-1": _finding()}
    improvements = InMemoryImprovementRepository(with_seed=False, user_id="t")
    improvements._store = {"imp-1": _improvement()}
    candidates = InMemoryCandidateRepository(with_seed=False, user_id="t")
    candidates._store = {"cand-1": _candidate()}

    use_case = DeleteCourse(
        repository=courses,
        graph_projection=_FakeGraphProjection({"EXP-MCU-01"}),
        candidates_repo=candidates,
        findings_repo=findings,
        improvements_repo=improvements,
    )
    asyncio.run(use_case.execute("course-1"))

    assert courses._store == {}
    assert candidates._store == {}  # 按 course 命中
    assert findings._store == {}    # 按 course + 节点命中
    assert improvements._store == {}  # 按 course 命中


def test_delete_course_keeps_unrelated_data() -> None:
    courses = InMemoryCourseRepository(with_seed=False, user_id="t")
    courses._store = {"course-1": _course()}
    findings = InMemoryFindingRepository(with_seed=False, user_id="t")
    other = _finding(course="数据结构", source="EXP-DS-01")
    findings._store = {"finding-other": other}
    improvements = InMemoryImprovementRepository(with_seed=False, user_id="t")
    other_imp = type(_improvement())(
        id="imp-other", title="t", description="d", course="数据结构",
        action="a", owner="o", status=ImprovementStatus.OPEN,
        finding_id=None,
        target_code="C-01-01", target_name="工程知识应用",
        root_cause="r", expected_effect="e", deadline="2026-09-01",
    )
    improvements._store = {"imp-other": other_imp}

    use_case = DeleteCourse(
        repository=courses,
        graph_projection=_FakeGraphProjection({"EXP-MCU-01"}),
        findings_repo=findings,
        improvements_repo=improvements,
    )
    asyncio.run(use_case.execute("course-1"))

    assert "finding-other" in findings._store  # 其他课程发现保留
    assert "imp-other" in improvements._store  # 其他课程改进保留


def test_delete_resource_cascades_candidates_and_findings() -> None:
    resources = InMemoryResourceRepository(with_seed=False, user_id="t")
    resources._store = {"res-1": _resource()}
    candidates = InMemoryCandidateRepository(with_seed=False, user_id="t")
    candidates._store = {"cand-1": _candidate()}
    findings = InMemoryFindingRepository(with_seed=False, user_id="t")
    findings._store = {"finding-1": _finding()}

    use_case = DeleteResource(
        repository=resources,
        candidates_repo=candidates,
        findings_repo=findings,
    )
    deleted = asyncio.run(use_case.execute("res-1"))

    assert deleted is True
    assert resources._store == {}
    assert candidates._store == {}  # evidence.resource_name 命中
    assert findings._store == {}    # evidence.object_name 命中


def test_delete_missing_resource_is_noop() -> None:
    resources = InMemoryResourceRepository(with_seed=False, user_id="t")
    use_case = DeleteResource(repository=resources)
    assert asyncio.run(use_case.execute("res-missing")) is False
