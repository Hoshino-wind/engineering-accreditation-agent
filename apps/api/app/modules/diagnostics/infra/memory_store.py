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
        title="课程目标 CT-5 无实验项目覆盖",
        course="数据结构",
        type=DiagnosticFindingType.COVERAGE_GAP,
        risk=DiagnosticFindingRisk.HIGH,
        source_node="课程目标 CT-5",
        target_node="（无对应实验项目）",
        relation_label="覆盖",
        graph_version="图谱 v0.3",
        rule_id="RULE-COV-001",
        rule_version="v1.2",
        rule_kind="deterministic",
        rule_basis="每个课程目标至少被一个实验项目支撑",
        rule_rationale="CT-5 在图谱中无任何入边，达成度评价将无法计算该目标。",
        rule_run_at="2026-07-28 06:00",
        impact_course_objectives=1,
        impact_ability_nodes=2,
        impact_evaluation_inputs=3,
        suggested_destination="M3",
        evidence=(
            DiagnosticEvidenceRef(
                id="diag-ev-ct5-01",
                object_name="《数据结构》课程教学大纲",
                object_version="v3",
                coordinate="第 14 页 · 表 3-2 · 第 9 行",
                excerpt="课程目标 CT-5：能够对实验结果进行分析并撰写规范报告。",
                hash="SHA256 3b7e…f291",
            ),
        ),
    ),
    DiagnosticFinding(
        id="finding-conflict-sort",
        title="排序算法实验目标映射冲突",
        course="数据结构",
        type=DiagnosticFindingType.MATERIAL_CONFLICT,
        risk=DiagnosticFindingRisk.MEDIUM,
        source_node="排序算法综合实验",
        target_node="课程目标 CT-2 / CT-3",
        relation_label="支撑",
        graph_version="图谱 v0.3",
        rule_id="RULE-CON-002",
        rule_version="v1.2",
        rule_kind="ai-semantic",
        rule_basis="同一实验项目不应同时支撑存在包含关系的两个课程目标",
        rule_rationale="指导书 v2 描述更贴近 CT-2，但图谱中关联到 CT-3，来源为旧版指导书。",
        rule_run_at="2026-07-28 06:00",
        impact_course_objectives=2,
        impact_ability_nodes=1,
        impact_evaluation_inputs=2,
        suggested_destination="M4",
        evidence=(
            DiagnosticEvidenceRef(
                id="diag-ev-sort-01",
                object_name="数据结构实验指导书",
                object_version="v2",
                coordinate="第 63 页 · 实验七",
                excerpt="实现并比较快速排序、归并排序和堆排序，完成复杂度分析与实验验证。",
                hash="SHA256 641a…ec72",
            ),
            DiagnosticEvidenceRef(
                id="diag-ev-sort-02",
                object_name="数据结构实验指导书",
                object_version="v1",
                coordinate="第 55 页 · 实验六",
                excerpt="完成排序算法实现，验证正确性。",
                hash="SHA256 9f21…4a8c",
            ),
        ),
    ),
    DiagnosticFinding(
        id="finding-structure-orphan",
        title="能力节点 BA-7 无上游课程目标关联",
        course="数据结构",
        type=DiagnosticFindingType.STRUCTURAL_RISK,
        risk=DiagnosticFindingRisk.LOW,
        source_node="能力节点 BA-7",
        target_node="（无上游课程目标）",
        relation_label="归属",
        graph_version="图谱 v0.3",
        rule_id="RULE-STR-003",
        rule_version="v1.2",
        rule_kind="deterministic",
        rule_basis="能力节点应至少归属一个课程目标",
        rule_rationale="BA-7 为孤立节点，不影响当前评价但影响毕业要求达成度汇总。",
        rule_run_at="2026-07-28 06:00",
        impact_course_objectives=0,
        impact_ability_nodes=1,
        impact_evaluation_inputs=0,
        suggested_destination="M4",
        evidence=(
            DiagnosticEvidenceRef(
                id="diag-ev-ba7-01",
                object_name="能力图谱定义",
                object_version="v0.3",
                coordinate="节点 BA-7",
                excerpt="BA-7：能够对算法进行空间与时间复杂度分析。",
                hash="SHA256 c4d8…1e53",
            ),
        ),
    ),
]


class InMemoryFindingRepository:
    def __init__(self, with_seed: bool = True) -> None:
        if with_seed:
            self._store: dict[str, DiagnosticFinding] = {
                f.id: f for f in _SEED_FINDINGS
            }
        else:
            self._store: dict[str, DiagnosticFinding] = {}

    def clone(self) -> "InMemoryFindingRepository":
        new_repo = InMemoryFindingRepository(with_seed=False)
        new_repo._store = {
            fid: replace(finding) for fid, finding in self._store.items()
        }
        return new_repo

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

    async def add(self, finding: DiagnosticFinding) -> DiagnosticFinding:
        self._store[finding.id] = finding
        return finding

    async def add_many(self, findings: list[DiagnosticFinding]) -> list[DiagnosticFinding]:
        for f in findings:
            self._store[f.id] = f
        return findings

    async def replace_graph_findings(
        self,
        findings: list[DiagnosticFinding],
    ) -> list[DiagnosticFinding]:
        existing_status = {
            finding.id: finding.decision_status
            for finding in self._store.values()
            if finding.rule_id.startswith("GRAPH-DIAG-")
        }
        self._store = {
            finding_id: finding
            for finding_id, finding in self._store.items()
            if not finding.rule_id.startswith("GRAPH-DIAG-")
        }
        updated = [
            replace(finding, decision_status=existing_status.get(finding.id, finding.decision_status))
            for finding in findings
        ]
        for finding in updated:
            self._store[finding.id] = finding
        return updated

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
