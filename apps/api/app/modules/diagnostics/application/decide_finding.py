from datetime import UTC, datetime

from app.modules.diagnostics.application.ports import (
    FindingRepository,
    ImprovementRepository,
)
from app.modules.diagnostics.domain.finding import (
    DiagnosticFinding,
    DiagnosticFindingRisk,
    FindingDecisionStatus,
)
from app.modules.improvements.domain.improvement import (
    Improvement,
    ImprovementPriority,
    ImprovementStatus,
)


class DecideFinding:
    def __init__(
        self,
        repository: FindingRepository,
        improvements: ImprovementRepository | None = None,
    ) -> None:
        self._repository = repository
        self._improvements = improvements

    async def execute(
        self,
        finding_id: str,
        decision: str,
    ) -> DiagnosticFinding | None:
        status_map = {
            "confirm": FindingDecisionStatus.CONFIRMED,
            "dismiss": FindingDecisionStatus.DISMISSED,
            "convert": FindingDecisionStatus.CONVERTED,
        }
        status = status_map.get(decision)
        if status is None:
            raise ValueError(
                f"无效的处置决策: {decision!r}（可选值: confirm / dismiss / convert）"
            )
        finding = await self._repository.get_by_id(finding_id)
        if finding is None:
            return None
        updated = await self._repository.update_decision(finding_id, status)
        if decision == "convert" and updated is not None and self._improvements is not None:
            await self._ensure_improvement(updated)
        return updated

    async def _ensure_improvement(self, finding: DiagnosticFinding) -> None:
        assert self._improvements is not None
        existing = await self._improvements.list_all(major_id=finding.major_id)
        if any(item.finding_id == finding.id for item in existing):
            return

        now = datetime.now(UTC).strftime("%Y-%m-%d %H:%M")
        destination = (finding.suggested_destination or "M7").upper()
        action = {
            "M3": "补充或修订对应教学材料，重新上传后再次触发识别分析。",
            "M4": "返回识别与审核页面，修正候选节点、关系或证据后重新发布图谱。",
            "M2": "回到能力图谱页面修正关系结构，并重新运行诊断。",
        }.get(destination, "制定教学改进措施，补充证据后完成复评。")
        priority = {
            DiagnosticFindingRisk.HIGH: ImprovementPriority.HIGH,
            DiagnosticFindingRisk.MEDIUM: ImprovementPriority.MEDIUM,
            DiagnosticFindingRisk.LOW: ImprovementPriority.LOW,
        }[finding.risk]

        await self._improvements.add(
            Improvement(
                id=f"imp-diag-{finding.id}",
                title=f"处理诊断发现：{finding.title}",
                description=f"由 M5 图谱诊断转入：{finding.rule_rationale}",
                course=finding.course,
                finding_id=finding.id,
                target_code=finding.target_node.split(" ", 1)[0],
                target_name=finding.target_node,
                root_cause=finding.rule_basis,
                action=action,
                expected_effect="相关缺口被补齐，图谱关系和支撑材料可被复核。",
                owner="课程负责人",
                deadline=None,
                source_module="M5",
                source_label="图谱诊断",
                verification_method="补充材料或修正关系后，重新运行 M5 图谱诊断和后续达成度评价。",
                completion_summary="",
                evidence_uri="",
                reevaluation_result=None,
                baseline=None,
                target_value=1.0,
                major_id=finding.major_id,
                status=ImprovementStatus.OPEN,
                priority=priority,
                created_at=now,
                updated_at=now,
            )
        )
