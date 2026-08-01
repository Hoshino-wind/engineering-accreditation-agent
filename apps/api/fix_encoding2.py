# -*- coding: utf-8 -*-
"""Fix encoding for resources and diagnostics memory_store.py files."""
import pathlib

base = pathlib.Path(__file__).parent

# --- Resources ---
RESOURCES_STORE = '''\
# -*- coding: utf-8 -*-
from app.modules.resources.domain.resource import (
    EvidenceFragment,
    ProcessingStage,
    TeachingResource,
    TeachingResourceSensitivity,
    TeachingResourceStatus,
    TeachingResourceType,
)

_SEED_RESOURCES: list[TeachingResource] = [
    TeachingResource(
        id="resource-ds-syllabus",
        name="\u300a\u6570\u636e\u7ed3\u6784\u300b\u8bfe\u7a0b\u6559\u5b66\u5927\u7eb2",
        file_name="\u6570\u636e\u7ed3\u6784\u8bfe\u7a0b\u6559\u5b66\u5927\u7eb2-2025\u7248.pdf",
        course="\u6570\u636e\u7ed3\u6784",
        resource_type=TeachingResourceType.SYLLABUS,
        version="v3",
        format="PDF",
        status=TeachingResourceStatus.READY,
        size="2.8 MB",
        sensitivity=TeachingResourceSensitivity.INTERNAL,
        updated_at="2026-07-26 16:42",
        owner="\u674e\u8001\u5e08",
        hash="SHA256 83d4\u2026b719",
        next_action="\u53ef\u8fdb\u5165 M4 \u8bc6\u522b",
        source_coverage=96,
        page_count=32,
        evidence_fragments=(
            EvidenceFragment(
                id="fragment-ds-syllabus-01",
                coordinate="\u7b2c 6 \u9875 \u00b7 \u7b2c 2 \u6bb5",
                type="\u6bb5\u843d",
                preview="\u901a\u8fc7\u7ebf\u6027\u8868\u3001\u6811\u548c\u56fe\u7684\u5b9e\u9a8c\uff0c\u4f7f\u5b66\u751f\u80fd\u591f\u9009\u62e9\u9002\u5f53\u7684\u6570\u636e\u7ed3\u6784\u89e3\u51b3\u5b9e\u9645\u95ee\u9898\u3002",
                hash="7fe1\u20260ab4",
            ),
            EvidenceFragment(
                id="fragment-ds-syllabus-02",
                coordinate="\u7b2c 12 \u9875 \u00b7 \u8868 3-2 \u00b7 \u7b2c 4 \u884c",
                type="\u8868\u683c",
                preview="\u5b9e\u9a8c\u9879\u76ee\uff1a\u4e8c\u53c9\u6811\u904d\u5386\u4e0e\u5e94\u7528\uff1b\u5bf9\u5e94\u8bfe\u7a0b\u76ee\u6807\uff1aCO2\u3001CO3\u3002",
                hash="d204\u202691c6",
            ),
        ),
        processing_stages=(
            ProcessingStage(label="\u5b89\u5168\u6821\u9a8c", detail="\u6587\u4ef6\u5934\u3001MIME \u4e0e\u54c8\u5e0c\u4e00\u81f4", status="finish"),
            ProcessingStage(label="\u5185\u5bb9\u89e3\u6790", detail="32 \u9875\u6587\u672c\u4e0e 7 \u4e2a\u8868\u683c\u5df2\u63d0\u53d6", status="finish"),
            ProcessingStage(label="\u654f\u611f\u68c0\u6d4b", detail="\u672a\u53d1\u73b0\u4e2a\u4eba\u654f\u611f\u4fe1\u606f", status="finish"),
            ProcessingStage(label="\u5206\u7c7b\u786e\u8ba4", detail="\u8bfe\u7a0b\u4e0e\u6750\u6599\u7c7b\u578b\u5df2\u786e\u8ba4", status="finish"),
        ),
    ),
    TeachingResource(
        id="resource-ds-guide",
        name="\u6570\u636e\u7ed3\u6784\u5b9e\u9a8c\u6307\u5bfc\u4e66",
        file_name="\u6570\u636e\u7ed3\u6784\u5b9e\u9a8c\u6307\u5bfc\u4e66-v2.docx",
        course="\u6570\u636e\u7ed3\u6784",
        resource_type=TeachingResourceType.LAB_GUIDE,
        version="v2",
        format="DOCX",
        status=TeachingResourceStatus.READY,
        size="6.4 MB",
        sensitivity=TeachingResourceSensitivity.INTERNAL,
        updated_at="2026-07-25 10:18",
        owner="\u674e\u8001\u5e08",
        hash="SHA256 6ae2\u2026af03",
        next_action="\u53ef\u8fdb\u5165 M4 \u8bc6\u522b",
        source_coverage=93,
        page_count=84,
        evidence_fragments=(
            EvidenceFragment(
                id="fragment-ds-guide-01",
                coordinate="\u7b2c 14 \u9875 \u00b7 \u5b9e\u9a8c\u4e8c \u00b7 \u76ee\u6807",
                type="\u6bb5\u843d",
                preview="\u638c\u63e1\u6808\u4e0e\u961f\u5217\u7684\u57fa\u672c\u64cd\u4f5c\uff0c\u5e76\u80fd\u7528\u4e8e\u8868\u8fbe\u5f0f\u6c42\u503c\u548c\u8ff7\u5bab\u6c42\u89e3\u3002",
                hash="fe34\u20266f20",
            ),
            EvidenceFragment(
                id="fragment-ds-guide-02",
                coordinate="\u7b2c 41 \u9875 \u00b7 \u8868 5-1",
                type="\u8868\u683c",
                preview="\u5173\u952e\u8bc4\u5206\u70b9\uff1a\u7b97\u6cd5\u6b63\u786e\u6027 40%\uff0c\u590d\u6742\u5ea6\u5206\u6790 20%\uff0c\u5b9e\u9a8c\u62a5\u544a 40%\u3002",
                hash="c551\u202626b0",
            ),
        ),
        processing_stages=(
            ProcessingStage(label="\u5b89\u5168\u6821\u9a8c", detail="\u6587\u4ef6\u7ed3\u6784\u4e0e\u54c8\u5e0c\u6821\u9a8c\u901a\u8fc7", status="finish"),
            ProcessingStage(label="\u5185\u5bb9\u89e3\u6790", detail="84 \u9875\u6587\u672c\u4e0e 15 \u4e2a\u8868\u683c\u5df2\u63d0\u53d6", status="finish"),
            ProcessingStage(label="\u654f\u611f\u68c0\u6d4b", detail="\u672a\u53d1\u73b0\u4e2a\u4eba\u654f\u611f\u4fe1\u606f", status="finish"),
            ProcessingStage(label="\u5206\u7c7b\u786e\u8ba4", detail="\u8bfe\u7a0b\u4e0e\u6750\u6599\u7c7b\u578b\u5df2\u786e\u8ba4", status="finish"),
        ),
    ),
    TeachingResource(
        id="resource-ds-rubric",
        name="\u6570\u636e\u7ed3\u6784\u7efc\u5408\u5b9e\u9a8c\u8bc4\u5206\u8868",
        file_name="\u7efc\u5408\u5b9e\u9a8c\u8bc4\u5206\u8868-2025\u79cb.xlsx",
        course="\u6570\u636e\u7ed3\u6784",
        resource_type=TeachingResourceType.RUBRIC,
        version="v4",
        format="XLSX",
        status=TeachingResourceStatus.READY,
        size="780 KB",
        sensitivity=TeachingResourceSensitivity.RESTRICTED,
        updated_at="2026-07-24 14:05",
        owner="\u738b\u8001\u5e08",
        hash="SHA256 21f7\u2026d38c",
        next_action="\u6838\u5bf9\u53d7\u9650\u8bbf\u95ee\u8303\u56f4",
        source_coverage=100,
        evidence_fragments=(
            EvidenceFragment(
                id="fragment-ds-rubric-01",
                coordinate="\u5de5\u4f5c\u8868\u300c\u8bc4\u5206\u6807\u51c6\u300d \u00b7 B3:F12",
                type="\u8868\u683c",
                preview="\u95ee\u9898\u5206\u6790\u3001\u6570\u636e\u7ed3\u6784\u9009\u62e9\u3001\u7b97\u6cd5\u5b9e\u73b0\u3001\u6d4b\u8bd5\u9a8c\u8bc1\u548c\u62a5\u544a\u89c4\u8303\u4e94\u7c7b\u8bc4\u5206\u9879\u3002",
                hash="aa27\u20260dd9",
            ),
        ),
        processing_stages=(
            ProcessingStage(label="\u5b89\u5168\u6821\u9a8c", detail="\u5de5\u4f5c\u7c3f\u7ed3\u6784\u4e0e\u54c8\u5e0c\u6821\u9a8c\u901a\u8fc7", status="finish"),
            ProcessingStage(label="\u5185\u5bb9\u89e3\u6790", detail="6 \u4e2a\u5de5\u4f5c\u8868\u4e0e 32 \u4e2a\u8bc4\u5206\u9879\u5df2\u63d0\u53d6", status="finish"),
            ProcessingStage(label="\u654f\u611f\u68c0\u6d4b", detail="\u542b\u8bc4\u5206\u6570\u636e\uff0c\u5df2\u5207\u6362\u53d7\u63a7\u89c6\u56fe", status="finish"),
            ProcessingStage(label="\u5206\u7c7b\u786e\u8ba4", detail="\u8bfe\u7a0b\u4e0e\u6750\u6599\u7c7b\u578b\u5df2\u786e\u8ba4", status="finish"),
        ),
    ),
    TeachingResource(
        id="resource-se-guide",
        name="\u8f6f\u4ef6\u5de5\u7a0b\u8bfe\u7a0b\u8bbe\u8ba1\u6307\u5bfc\u4e66",
        file_name="\u8f6f\u4ef6\u5de5\u7a0b\u8bfe\u7a0b\u8bbe\u8ba1\u6307\u5bfc\u4e66-v2.pdf",
        course="\u8f6f\u4ef6\u5de5\u7a0b",
        resource_type=TeachingResourceType.LAB_GUIDE,
        version="v2",
        format="PDF",
        status=TeachingResourceStatus.PROCESSING,
        size="12.6 MB",
        sensitivity=TeachingResourceSensitivity.INTERNAL,
        updated_at="2026-07-28 09:34",
        owner="\u8d75\u8001\u5e08",
        hash="SHA256 bd8e\u2026908f",
        next_action="\u7b49\u5f85\u8868\u683c\u89e3\u6790\u5b8c\u6210",
        source_coverage=58,
        page_count=116,
        evidence_fragments=(
            EvidenceFragment(
                id="fragment-se-guide-01",
                coordinate="\u7b2c 8 \u9875 \u00b7 \u7b2c 3 \u6bb5",
                type="\u6bb5\u843d",
                preview="\u5b66\u751f\u5e94\u5b8c\u6210\u9700\u6c42\u5206\u6790\u3001\u67b6\u6784\u8bbe\u8ba1\u3001\u8fed\u4ee3\u5b9e\u73b0\u4e0e\u6d4b\u8bd5\u9a8c\u6536\u3002",
                hash="e8b2\u2026671a",
            ),
        ),
        processing_stages=(
            ProcessingStage(label="\u5b89\u5168\u6821\u9a8c", detail="\u6587\u4ef6\u5934\u3001MIME \u4e0e\u54c8\u5e0c\u4e00\u81f4", status="finish"),
            ProcessingStage(label="\u5185\u5bb9\u89e3\u6790", detail="\u6b63\u5728\u89e3\u6790\u9644\u5f55\u4e2d\u7684 18 \u4e2a\u590d\u6742\u8868\u683c", status="process"),
            ProcessingStage(label="\u654f\u611f\u68c0\u6d4b", detail="\u7b49\u5f85\u5185\u5bb9\u89e3\u6790\u5b8c\u6210", status="wait"),
            ProcessingStage(label="\u5206\u7c7b\u786e\u8ba4", detail="\u7b49\u5f85\u5904\u7406\u5b8c\u6210", status="wait"),
        ),
    ),
    TeachingResource(
        id="resource-os-rubric",
        name="\u64cd\u4f5c\u7cfb\u7edf\u5b9e\u9a8c\u8bc4\u5206\u8bb0\u5f55",
        file_name="\u64cd\u4f5c\u7cfb\u7edf\u5b9e\u9a8c\u8bc4\u5206\u8bb0\u5f55-\u626b\u63cf\u7248.pdf",
        course="\u64cd\u4f5c\u7cfb\u7edf",
        resource_type=TeachingResourceType.RUBRIC,
        version="v1",
        format="PDF",
        status=TeachingResourceStatus.FAILED,
        size="18.2 MB",
        sensitivity=TeachingResourceSensitivity.RESTRICTED,
        updated_at="2026-07-28 08:12",
        owner="\u5468\u8001\u5e08",
        hash="SHA256 71c0\u202602ea",
        next_action="\u91cd\u65b0\u626b\u63cf\u540e\u53d1\u8d77\u89e3\u6790",
        source_coverage=12,
        page_count=47,
        failure_reason="\u7b2c 9\u201431 \u9875\u6e05\u6670\u5ea6\u4f4e\u4e8e OCR \u9608\u503c\uff0c\u65e0\u6cd5\u7a33\u5b9a\u5b9a\u4f4d\u8bc4\u5206\u9879\u3002",
        processing_stages=(
            ProcessingStage(label="\u5b89\u5168\u6821\u9a8c", detail="\u6587\u4ef6\u5b89\u5168\u6821\u9a8c\u901a\u8fc7", status="finish"),
            ProcessingStage(label="\u5185\u5bb9\u89e3\u6790", detail="23 \u9875 OCR \u8d28\u91cf\u4e0d\u8db3\uff0c\u4efb\u52a1\u5df2\u505c\u6b62", status="error"),
            ProcessingStage(label="\u654f\u611f\u68c0\u6d4b", detail="\u7b49\u5f85\u91cd\u65b0\u89e3\u6790", status="wait"),
            ProcessingStage(label="\u5206\u7c7b\u786e\u8ba4", detail="\u7b49\u5f85\u91cd\u65b0\u89e3\u6790", status="wait"),
        ),
    ),
]


class InMemoryResourceRepository:
    def __init__(self) -> None:
        self._store: dict[str, TeachingResource] = {
            r.id: r for r in _SEED_RESOURCES
        }

    async def list_all(
        self,
        *,
        course: str | None = None,
        status: str | None = None,
        resource_type: str | None = None,
    ) -> list[TeachingResource]:
        results = list(self._store.values())
        if course:
            results = [r for r in results if r.course == course]
        if status:
            results = [r for r in results if r.status == status]
        if resource_type:
            results = [r for r in results if r.resource_type == resource_type]
        return results

    async def get_by_id(self, resource_id: str) -> TeachingResource | None:
        return self._store.get(resource_id)
'''

# --- Diagnostics ---
DIAGNOSTICS_STORE = '''\
# -*- coding: utf-8 -*-
from dataclasses import replace

from app.modules.diagnostics.domain.finding import (
    DiagnosticEvidenceRef,
    DiagnosticFinding,
    DiagnosticFindingRisk,
    DiagnosticFindingType,
    FindingDecisionStatus,
)

_SEED_FINDINGS: list[DiagnosticFinding] = [
    DiagnosticFinding(
        id="finding-coverage-ct5",
        title="\u8bfe\u7a0b\u76ee\u6807 CT-5 \u65e0\u5b9e\u9a8c\u9879\u76ee\u8986\u76d6",
        course="\u6570\u636e\u7ed3\u6784",
        type=DiagnosticFindingType.COVERAGE_GAP,
        risk=DiagnosticFindingRisk.HIGH,
        source_node="\u8bfe\u7a0b\u76ee\u6807 CT-5",
        target_node="\uff08\u65e0\u5bf9\u5e94\u5b9e\u9a8c\u9879\u76ee\uff09",
        relation_label="\u8986\u76d6",
        graph_version="\u56fe\u8c31 v0.3",
        rule_id="RULE-COV-001",
        rule_version="v1.2",
        rule_kind="deterministic",
        rule_basis="\u6bcf\u4e2a\u8bfe\u7a0b\u76ee\u6807\u81f3\u5c11\u88ab\u4e00\u4e2a\u5b9e\u9a8c\u9879\u76ee\u652f\u6491",
        rule_rationale="CT-5 \u5728\u56fe\u8c31\u4e2d\u65e0\u4efb\u4f55\u5165\u8fb9\uff0c\u8fbe\u6210\u5ea6\u8bc4\u4ef7\u5c06\u65e0\u6cd5\u8ba1\u7b97\u8be5\u76ee\u6807\u3002",
        rule_run_at="2026-07-28 06:00",
        impact_course_objectives=1,
        impact_ability_nodes=2,
        impact_evaluation_inputs=3,
        suggested_destination="M3",
        evidence=(
            DiagnosticEvidenceRef(
                id="diag-ev-ct5-01",
                object_name="\u300a\u6570\u636e\u7ed3\u6784\u300b\u8bfe\u7a0b\u6559\u5b66\u5927\u7eb2",
                object_version="v3",
                coordinate="\u7b2c 14 \u9875 \u00b7 \u8868 3-2 \u00b7 \u7b2c 9 \u884c",
                excerpt="\u8bfe\u7a0b\u76ee\u6807 CT-5\uff1a\u80fd\u591f\u5bf9\u5b9e\u9a8c\u7ed3\u679c\u8fdb\u884c\u5206\u6790\u5e76\u64b0\u5199\u89c4\u8303\u62a5\u544a\u3002",
                hash="SHA256 3b7e\u2026f291",
            ),
        ),
    ),
    DiagnosticFinding(
        id="finding-conflict-sort",
        title="\u6392\u5e8f\u7b97\u6cd5\u5b9e\u9a8c\u76ee\u6807\u6620\u5c04\u51b2\u7a81",
        course="\u6570\u636e\u7ed3\u6784",
        type=DiagnosticFindingType.MATERIAL_CONFLICT,
        risk=DiagnosticFindingRisk.MEDIUM,
        source_node="\u6392\u5e8f\u7b97\u6cd5\u7efc\u5408\u5b9e\u9a8c",
        target_node="\u8bfe\u7a0b\u76ee\u6807 CT-2 / CT-3",
        relation_label="\u652f\u6491",
        graph_version="\u56fe\u8c31 v0.3",
        rule_id="RULE-CON-002",
        rule_version="v1.2",
        rule_kind="ai-semantic",
        rule_basis="\u540c\u4e00\u5b9e\u9a8c\u9879\u76ee\u4e0d\u5e94\u540c\u65f6\u652f\u6491\u5b58\u5728\u5305\u542b\u5173\u7cfb\u7684\u4e24\u4e2a\u8bfe\u7a0b\u76ee\u6807",
        rule_rationale="\u6307\u5bfc\u4e66 v2 \u63cf\u8ff0\u66f4\u8d34\u8fd1 CT-2\uff0c\u4f46\u56fe\u8c31\u4e2d\u5173\u8054\u5230 CT-3\uff0c\u6765\u6e90\u4e3a\u65e7\u7248\u6307\u5bfc\u4e66\u3002",
        rule_run_at="2026-07-28 06:00",
        impact_course_objectives=2,
        impact_ability_nodes=1,
        impact_evaluation_inputs=2,
        suggested_destination="M4",
        evidence=(
            DiagnosticEvidenceRef(
                id="diag-ev-sort-01",
                object_name="\u6570\u636e\u7ed3\u6784\u5b9e\u9a8c\u6307\u5bfc\u4e66",
                object_version="v2",
                coordinate="\u7b2c 63 \u9875 \u00b7 \u5b9e\u9a8c\u4e03",
                excerpt="\u5b9e\u73b0\u5e76\u6bd4\u8f83\u5feb\u901f\u6392\u5e8f\u3001\u5f52\u5e76\u6392\u5e8f\u548c\u5806\u6392\u5e8f\uff0c\u5b8c\u6210\u590d\u6742\u5ea6\u5206\u6790\u4e0e\u5b9e\u9a8c\u9a8c\u8bc1\u3002",
                hash="SHA256 641a\u2026ec72",
            ),
            DiagnosticEvidenceRef(
                id="diag-ev-sort-02",
                object_name="\u6570\u636e\u7ed3\u6784\u5b9e\u9a8c\u6307\u5bfc\u4e66",
                object_version="v1",
                coordinate="\u7b2c 55 \u9875 \u00b7 \u5b9e\u9a8c\u516d",
                excerpt="\u5b8c\u6210\u6392\u5e8f\u7b97\u6cd5\u5b9e\u73b0\uff0c\u9a8c\u8bc1\u6b63\u786e\u6027\u3002",
                hash="SHA256 9f21\u20264a8c",
            ),
        ),
    ),
    DiagnosticFinding(
        id="finding-structure-orphan",
        title="\u80fd\u529b\u8282\u70b9 BA-7 \u65e0\u4e0a\u6e38\u8bfe\u7a0b\u76ee\u6807\u5173\u8054",
        course="\u6570\u636e\u7ed3\u6784",
        type=DiagnosticFindingType.STRUCTURAL_RISK,
        risk=DiagnosticFindingRisk.LOW,
        source_node="\u80fd\u529b\u8282\u70b9 BA-7",
        target_node="\uff08\u65e0\u4e0a\u6e38\u8bfe\u7a0b\u76ee\u6807\uff09",
        relation_label="\u5f52\u5c5e",
        graph_version="\u56fe\u8c31 v0.3",
        rule_id="RULE-STR-003",
        rule_version="v1.2",
        rule_kind="deterministic",
        rule_basis="\u80fd\u529b\u8282\u70b9\u5e94\u81f3\u5c11\u5f52\u5c5e\u4e00\u4e2a\u8bfe\u7a0b\u76ee\u6807",
        rule_rationale="BA-7 \u4e3a\u5b64\u7acb\u8282\u70b9\uff0c\u4e0d\u5f71\u54cd\u5f53\u524d\u8bc4\u4ef7\u4f46\u5f71\u54cd\u6bd5\u4e1a\u8981\u6c42\u8fbe\u6210\u5ea6\u6c47\u603b\u3002",
        rule_run_at="2026-07-28 06:00",
        impact_course_objectives=0,
        impact_ability_nodes=1,
        impact_evaluation_inputs=0,
        suggested_destination="M4",
        evidence=(
            DiagnosticEvidenceRef(
                id="diag-ev-ba7-01",
                object_name="\u80fd\u529b\u56fe\u8c31\u5b9a\u4e49",
                object_version="v0.3",
                coordinate="\u8282\u70b9 BA-7",
                excerpt="BA-7\uff1a\u80fd\u591f\u5bf9\u7b97\u6cd5\u8fdb\u884c\u7a7a\u95f4\u4e0e\u65f6\u95f4\u590d\u6742\u5ea6\u5206\u6790\u3002",
                hash="SHA256 c4d8\u20261e53",
            ),
        ),
    ),
]


class InMemoryFindingRepository:
    def __init__(self) -> None:
        self._store: dict[str, DiagnosticFinding] = {
            f.id: f for f in _SEED_FINDINGS
        }

    async def list_all(
        self,
        *,
        course: str | None = None,
        risk: str | None = None,
        finding_type: str | None = None,
    ) -> list[DiagnosticFinding]:
        results = list(self._store.values())
        if course:
            results = [f for f in results if f.course == course]
        if risk:
            results = [f for f in results if f.risk == risk]
        if finding_type:
            results = [f for f in results if f.type == finding_type]
        return results

    async def get_by_id(self, finding_id: str) -> DiagnosticFinding | None:
        return self._store.get(finding_id)

    async def update_decision(
        self,
        finding_id: str,
        status: FindingDecisionStatus,
    ) -> DiagnosticFinding | None:
        existing = self._store.get(finding_id)
        if existing is None:
            return None
        updated = replace(existing, decision_status=status)
        self._store[finding_id] = updated
        return updated
'''

# Write files
res_target = base / "app" / "modules" / "resources" / "infra" / "memory_store.py"
res_target.write_text(RESOURCES_STORE, encoding="utf-8")
print(f"OK: resources ({res_target.stat().st_size} bytes)")

diag_target = base / "app" / "modules" / "diagnostics" / "infra" / "memory_store.py"
diag_target.write_text(DIAGNOSTICS_STORE, encoding="utf-8")
print(f"OK: diagnostics ({diag_target.stat().st_size} bytes)")
