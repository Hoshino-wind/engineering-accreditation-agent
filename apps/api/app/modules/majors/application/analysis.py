"""学院级分析与资源优化建议（第 5 步补缺）。

- GetMajorAnalysis: 单专业 覆盖缺口 + 材料健康度 → 规则化资源优化建议
- GetMajorSummary: 跨专业汇总（学院级对比）：覆盖率/材料健康/资源量
"""
from __future__ import annotations

from dataclasses import dataclass

from app.modules.majors.application.ports import MajorRepository
from app.modules.resources.application.material_health import assess_material_health
from app.modules.resources.application.ports import ResourceRepository

# 建议门槛（试点默认值）
_HEALTH_GAP_THRESHOLD = 60
_COVERAGE_GAP_THRESHOLD = 0.6


@dataclass(frozen=True, slots=True)
class ResourceSuggestion:
    kind: str  # add-material / improve-material / verify-coverage
    target: str
    reason: str
    detail: str
    priority: str  # high / medium / low


@dataclass(frozen=True, slots=True)
class MajorAnalysis:
    major_id: str
    major_name: str
    resource_count: int
    health_score: int
    risk_count: int
    coverage_rate: float | None
    gap_competencies: list[str]
    suggestions: tuple[ResourceSuggestion, ...]


@dataclass(frozen=True, slots=True)
class MajorSummaryRow:
    major_id: str
    major_name: str
    resource_count: int
    health_score: int
    risk_count: int
    coverage_rate: float | None


@dataclass(frozen=True, slots=True)
class MajorSummary:
    major_count: int
    average_health: float
    rows: tuple[MajorSummaryRow, ...]


class GetMajorAnalysis:
    """单专业分析：材料健康 + 覆盖缺口 → 资源优化建议。"""

    def __init__(
        self,
        majors: MajorRepository,
        resources: ResourceRepository,
        coverage_provider,
    ) -> None:
        self._majors = majors
        self._resources = resources
        self._coverage_provider = coverage_provider

    async def execute(self, major_id: str) -> MajorAnalysis:
        major = await self._majors.get_by_id(major_id)
        name = major.name if major else "Unregistered major"
        resources = await self._resources.list_all()
        major_resources = [r for r in resources if r.major_id == major_id]
        health = assess_material_health(major_resources)

        # 覆盖缺口（从图谱投影当前覆盖率）
        coverage_rate: float | None = None
        gap_competencies: list[str] = []
        try:
            report = await self._coverage_provider()
            coverage_rate = report.get("coverageRate")
            gaps = report.get("gaps") or []
            gap_competencies = [g.get("code", "") for g in gaps if g.get("code")]
        except Exception:
            coverage_rate = None

        suggestions: list[ResourceSuggestion] = []
        # ① 健康度低 → 材料治理建议
        if health.health_score < _HEALTH_GAP_THRESHOLD:
            suggestions.append(
                ResourceSuggestion(
                    kind="improve-material",
                    target=major_id,
                    reason=f"材料健康度 {health.health_score} 低于阈值 {_HEALTH_GAP_THRESHOLD}",
                    detail=(
                    f"存在 {health.risk_count} 项风险材料，"
                    "建议优先治理（版本过期/分类缺失/来源不明）"
                ),
                    priority="high",
                )
            )
        # ② 覆盖缺口 → 补充资源建议
        for code in gap_competencies:
            suggestions.append(
                ResourceSuggestion(
                    kind="add-material",
                    target=code,
                    reason=f"能力指标 {code} 覆盖不足",
                    detail="建议补充对应的实验指导书、评分表或课程大纲材料，并建立支撑关系",
                    priority=(
                        "high"
                        if coverage_rate is not None
                        and coverage_rate < _COVERAGE_GAP_THRESHOLD
                        else "medium"
                    ),
                )
            )
        # ③ 资源量过少 → 低优先级提醒
        if health.total_resources == 0:
            suggestions.append(
                ResourceSuggestion(
                    kind="add-material",
                    target=major_id,
                    reason="该专业暂无教学材料",
                    detail="建议导入教学大纲与实验指导书，建立能力图谱数据基础",
                    priority="medium",
                )
            )
        return MajorAnalysis(
            major_id=major_id,
            major_name=name,
            resource_count=health.total_resources,
            health_score=health.health_score,
            risk_count=health.risk_count,
            coverage_rate=coverage_rate,
            gap_competencies=gap_competencies,
            suggestions=tuple(suggestions),
        )


class GetMajorSummary:
    """学院级汇总：全部专业横向对比。"""

    def __init__(
        self,
        majors: MajorRepository,
        resources: ResourceRepository,
        coverage_provider,
    ) -> None:
        self._majors = majors
        self._resources = resources
        self._coverage_provider = coverage_provider

    async def execute(self) -> MajorSummary:
        majors = await self._majors.list_all()
        resources = await self._resources.list_all()
        by_major: dict[str, list] = {}
        for resource in resources:
            by_major.setdefault(resource.major_id, []).append(resource)

        rows: list[MajorSummaryRow] = []
        for major in majors:
            health = assess_material_health(by_major.get(major.id, []))
            coverage_rate: float | None = None
            try:
                report = await self._coverage_provider(major.id)
                coverage_rate = report.get("coverageRate")
            except Exception:
                coverage_rate = None
            rows.append(
                MajorSummaryRow(
                    major_id=major.id,
                    major_name=major.name,
                    resource_count=health.total_resources,
                    health_score=health.health_score,
                    risk_count=health.risk_count,
                    coverage_rate=coverage_rate,
                )
            )
        avg_health = (
            sum(r.health_score for r in rows) / len(rows) if rows else 0.0
        )
        return MajorSummary(
            major_count=len(rows),
            average_health=round(avg_health, 1),
            rows=tuple(rows),
        )
