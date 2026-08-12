"""金标准样例的领域模型。

本模块只描述“人工算出来的达成度长什么样”，不依赖 API 服务代码。
校验器与被测系统必须保持独立实现，否则交叉复算退化为同义反复。
"""

from dataclasses import dataclass
from decimal import Decimal
from typing import Literal

SCHEMA_VERSION = 1

# 首期最小本体子集：只覆盖“能算出达成度”所必需的节点与关系。
# 完整本体见 docs/architecture/decisions/001-experimental-teaching-ontology.md。
ALLOWED_NODE_TYPES = frozenset(
    {
        "PerformanceIndicator",
        "Course",
        "CourseOutcome",
        "Experiment",
        "AssessmentTask",
        "RubricCriterion",
    }
)
ALLOWED_RELATIONS: dict[str, tuple[tuple[str, str], ...]] = {
    "DEFINES": (("Course", "CourseOutcome"),),
    "BELONGS_TO": (("Experiment", "Course"),),
    "SUPPORTS": (("CourseOutcome", "PerformanceIndicator"),),
    "CONTRIBUTES_TO": (
        ("Experiment", "CourseOutcome"),
        ("RubricCriterion", "CourseOutcome"),
    ),
    "CONTAINS_TASK": (("Experiment", "AssessmentTask"),),
    "CONTAINS_CRITERION": (("AssessmentTask", "RubricCriterion"),),
}

AttainmentMethod = Literal["mean_score_ratio", "passing_student_ratio"]
MissingScorePolicy = Literal["exclude", "zero", "block"]
SampleBasis = Literal["enrolled", "submitted"]
RoundingMode = Literal["half_up"]
AttainmentOutcome = Literal["achieved", "not_achieved"]


def _require_text(value: str, label: str) -> None:
    if not value or value != value.strip():
        raise ValueError(f"{label}不能为空且不得包含首尾空白")


def _require_ratio(value: Decimal, label: str) -> None:
    if value < 0 or value > 1:
        raise ValueError(f"{label}必须位于 0 到 1 之间")


def _require_digest(value: str, label: str) -> None:
    _require_text(value, label)
    if not value.startswith("sha256:"):
        raise ValueError(f"{label}必须以 sha256: 开头")
    hex_part = value.removeprefix("sha256:")
    if len(hex_part) != 64 or any(char not in "0123456789abcdef" for char in hex_part):
        raise ValueError(f"{label}必须是完整的 64 位十六进制摘要，不得省略中间字符")


@dataclass(frozen=True, slots=True)
class SourceRef:
    """一条正式事实的原文出处。

    金标准的价值在于每个数字都能回到原件，因此来源引用是必填项，
    并且摘要必须完整——省略号摘要无法用于复核。
    """

    material: str
    material_version: str
    locator: str
    digest: str

    def __post_init__(self) -> None:
        _require_text(self.material, "来源材料名称")
        _require_text(self.material_version, "来源材料版本")
        _require_text(self.locator, "来源定位")
        _require_digest(self.digest, "来源内容摘要")


@dataclass(frozen=True, slots=True)
class SampleContext:
    program: str
    program_version: str
    course_code: str
    course_name: str
    evaluation_cycle: str
    graph_version: str
    compiled_by: str
    compiled_at: str

    def __post_init__(self) -> None:
        for value, label in (
            (self.program, "专业名称"),
            (self.program_version, "培养方案版本"),
            (self.course_code, "课程编号"),
            (self.course_name, "课程名称"),
            (self.evaluation_cycle, "评价周期"),
            (self.graph_version, "图谱版本"),
            (self.compiled_by, "编制人"),
            (self.compiled_at, "编制时间"),
        ):
            _require_text(value, label)


@dataclass(frozen=True, slots=True)
class FormulaPolicy:
    """评价口径。

    这些字段是达成度争议的真正来源。金标准必须把它们全部显式冻结，
    否则“系统算得对不对”这个问题没有判据。
    """

    policy_version: str
    method: AttainmentMethod
    missing_score: MissingScorePolicy
    sample_basis: SampleBasis
    rounding: RoundingMode
    score_rate_dp: int
    contribution_dp: int
    attainment_dp: int
    weight_tolerance: Decimal
    passing_score_ratio: Decimal | None

    def __post_init__(self) -> None:
        _require_text(self.policy_version, "评价策略版本")
        for value, label in (
            (self.score_rate_dp, "得分率小数位"),
            (self.contribution_dp, "贡献值小数位"),
            (self.attainment_dp, "达成度小数位"),
        ):
            if value < 0 or value > 6:
                raise ValueError(f"{label}必须位于 0 到 6 之间")
        if self.weight_tolerance < 0:
            raise ValueError("权重闭合容差不能为负数")
        if self.method == "passing_student_ratio":
            if self.passing_score_ratio is None:
                raise ValueError("达标人数比例法必须声明单项达标线")
            _require_ratio(self.passing_score_ratio, "单项达标线")
        elif self.passing_score_ratio is not None:
            raise ValueError("平均分法不得声明单项达标线")


@dataclass(frozen=True, slots=True)
class GraphNode:
    node_id: str
    node_type: str
    label: str
    source: SourceRef

    def __post_init__(self) -> None:
        _require_text(self.node_id, "节点 ID")
        _require_text(self.label, "节点名称")
        if self.node_type not in ALLOWED_NODE_TYPES:
            allowed = "、".join(sorted(ALLOWED_NODE_TYPES))
            raise ValueError(f"节点类型 {self.node_type} 不在首期最小本体内；允许：{allowed}")


@dataclass(frozen=True, slots=True)
class GraphEdge:
    relation: str
    from_node: str
    to_node: str
    source: SourceRef

    def __post_init__(self) -> None:
        _require_text(self.from_node, "关系起点")
        _require_text(self.to_node, "关系终点")
        if self.relation not in ALLOWED_RELATIONS:
            allowed = "、".join(sorted(ALLOWED_RELATIONS))
            raise ValueError(f"关系类型 {self.relation} 不在首期最小本体内；允许：{allowed}")


@dataclass(frozen=True, slots=True)
class Criterion:
    """评分项及其在本次评价中的权重。

    ``max_score`` 是评分项满分，用于把原始分换算成得分率；
    ``weight`` 是该评分项在课程目标聚合中的权重。两者不可混用。
    """

    criterion_id: str
    label: str
    max_score: Decimal
    weight: Decimal
    source: SourceRef

    def __post_init__(self) -> None:
        _require_text(self.criterion_id, "评分项 ID")
        _require_text(self.label, "评分项名称")
        if self.max_score <= 0:
            raise ValueError(f"评分项 {self.criterion_id} 的满分必须为正数")
        _require_ratio(self.weight, f"评分项 {self.criterion_id} 的权重")


@dataclass(frozen=True, slots=True)
class ExpectedCriterionResult:
    """人工算出的单项中间值。

    只对最终达成度做比对不足以定位偏差，因此逐项中间值同样是金标准的一部分。
    """

    criterion_id: str
    valid_sample_count: int
    missing_sample_count: int
    score_sum: Decimal
    score_rate: Decimal | None
    contribution: Decimal | None

    def __post_init__(self) -> None:
        _require_text(self.criterion_id, "评分项 ID")
        if self.valid_sample_count < 0 or self.missing_sample_count < 0:
            raise ValueError(f"评分项 {self.criterion_id} 的样本数量不能为负数")
        if (self.score_rate is None) != (self.contribution is None):
            raise ValueError(
                f"评分项 {self.criterion_id} 的得分率与贡献值必须同时有值或同时为空"
            )
        if self.score_rate is not None:
            _require_ratio(self.score_rate, f"评分项 {self.criterion_id} 的得分率")
        if self.contribution is not None and self.contribution < 0:
            raise ValueError(f"评分项 {self.criterion_id} 的贡献值不能为负数")


@dataclass(frozen=True, slots=True)
class ExpectedResult:
    """人工结论。

    未就绪时 ``attainment`` 与 ``outcome`` 必须为空。
    “输入阻断”不是“未达成”，这一点由 ADR-001 第 8 节固定。
    """

    ready: bool
    blockers: tuple[str, ...]
    attainment: Decimal | None
    outcome: AttainmentOutcome | None
    weight_total: Decimal
    criteria: tuple[ExpectedCriterionResult, ...]

    def __post_init__(self) -> None:
        if self.ready:
            if self.blockers:
                raise ValueError("已就绪的人工结论不得包含阻断项")
            if self.attainment is None or self.outcome is None:
                raise ValueError("已就绪的人工结论必须包含达成度与达成结论")
            _require_ratio(self.attainment, "人工达成度")
        else:
            if not self.blockers:
                raise ValueError("未就绪的人工结论必须说明阻断原因")
            if self.attainment is not None or self.outcome is not None:
                raise ValueError("未就绪的人工结论不得包含达成度或达成结论")


@dataclass(frozen=True, slots=True)
class EvaluationTarget:
    """一个评价对象：一条“课程目标 → 指标点”的达成度结论。"""

    target_id: str
    course_outcome_id: str
    performance_indicator_id: str
    threshold: Decimal
    criteria: tuple[Criterion, ...]
    expected: ExpectedResult
    note: str = ""

    def __post_init__(self) -> None:
        _require_text(self.target_id, "评价对象 ID")
        _require_text(self.course_outcome_id, "课程目标 ID")
        _require_text(self.performance_indicator_id, "指标点 ID")
        _require_ratio(self.threshold, f"评价对象 {self.target_id} 的达成阈值")
        if not self.criteria:
            raise ValueError(f"评价对象 {self.target_id} 至少需要一个评分项")
        criterion_ids = [item.criterion_id for item in self.criteria]
        if len(set(criterion_ids)) != len(criterion_ids):
            raise ValueError(f"评价对象 {self.target_id} 的评分项 ID 不得重复")
        expected_ids = [item.criterion_id for item in self.expected.criteria]
        if expected_ids != criterion_ids:
            raise ValueError(
                f"评价对象 {self.target_id} 的人工中间值必须与评分项逐项一一对应且顺序一致"
            )


@dataclass(frozen=True, slots=True)
class ScoreRecord:
    """一名学生在一个评分项上的原始分。

    ``raw_score`` 为 None 表示缺考或未提交，是一个必须显式录入的事实，
    不能用“行缺失”表达——那样无法区分缺考与漏录。
    """

    student_ref: str
    criterion_id: str
    raw_score: Decimal | None

    def __post_init__(self) -> None:
        _require_text(self.student_ref, "学生代号")
        _require_text(self.criterion_id, "评分项 ID")
        if self.raw_score is not None and self.raw_score < 0:
            raise ValueError(f"{self.student_ref} 在 {self.criterion_id} 的原始分不能为负数")
        if self.student_ref.isdigit() and len(self.student_ref) >= 8:
            raise ValueError(
                f"学生代号 {self.student_ref} 疑似真实学号；金标准必须使用脱敏代号"
            )


@dataclass(frozen=True, slots=True)
class GoldenSample:
    sample_id: str
    schema_version: int
    synthetic: bool
    context: SampleContext
    policy: FormulaPolicy
    nodes: tuple[GraphNode, ...]
    edges: tuple[GraphEdge, ...]
    targets: tuple[EvaluationTarget, ...]
    scores: tuple[ScoreRecord, ...]

    def __post_init__(self) -> None:
        _require_text(self.sample_id, "金标准样例 ID")
        if self.schema_version != SCHEMA_VERSION:
            raise ValueError(f"不支持的金标准样例版本：{self.schema_version}")
        if not self.targets:
            raise ValueError("金标准样例至少需要一个评价对象")
        self._validate_graph()
        self._validate_scores()

    def _validate_graph(self) -> None:
        node_types = {node.node_id: node.node_type for node in self.nodes}
        if len(node_types) != len(self.nodes):
            raise ValueError("图谱节点 ID 不得重复")
        for edge in self.edges:
            for endpoint, label in ((edge.from_node, "起点"), (edge.to_node, "终点")):
                if endpoint not in node_types:
                    raise ValueError(f"关系 {edge.relation} 的{label} {endpoint} 不存在对应节点")
            pair = (node_types[edge.from_node], node_types[edge.to_node])
            if pair not in ALLOWED_RELATIONS[edge.relation]:
                raise ValueError(
                    f"关系 {edge.relation} 不允许 {pair[0]} → {pair[1]} 这一端点组合"
                )
        for target in self.targets:
            for node_id, label in (
                (target.course_outcome_id, "课程目标"),
                (target.performance_indicator_id, "指标点"),
            ):
                if node_id not in node_types:
                    raise ValueError(f"评价对象 {target.target_id} 引用了不存在的{label} {node_id}")
            self._require_edge(
                "SUPPORTS", target.course_outcome_id, target.performance_indicator_id
            )
            for criterion in target.criteria:
                if criterion.criterion_id not in node_types:
                    raise ValueError(
                        f"评分项 {criterion.criterion_id} 缺少对应的 RubricCriterion 节点"
                    )
                self._require_edge(
                    "CONTRIBUTES_TO", criterion.criterion_id, target.course_outcome_id
                )

    def _require_edge(self, relation: str, from_node: str, to_node: str) -> None:
        exists = any(
            edge.relation == relation and edge.from_node == from_node and edge.to_node == to_node
            for edge in self.edges
        )
        if not exists:
            raise ValueError(f"缺少正式关系：{from_node} -{relation}-> {to_node}")

    def _validate_scores(self) -> None:
        seen: set[tuple[str, str]] = set()
        for record in self.scores:
            key = (record.student_ref, record.criterion_id)
            if key in seen:
                raise ValueError(
                    f"{record.student_ref} 在 {record.criterion_id} 上存在重复评分记录"
                )
            seen.add(key)

        students = sorted({record.student_ref for record in self.scores})
        scored_criteria = {
            criterion.criterion_id
            for target in self.targets
            for criterion in target.criteria
        }
        recorded_criteria = {record.criterion_id for record in self.scores}
        unknown = recorded_criteria - scored_criteria
        if unknown:
            raise ValueError(f"评分数据引用了未定义的评分项：{'、'.join(sorted(unknown))}")

        # 逐生逐项必须齐全：缺考用空值显式表达，漏录必须暴露为错误。
        for target in self.targets:
            for criterion in target.criteria:
                if criterion.criterion_id not in recorded_criteria:
                    continue
                missing = [
                    student
                    for student in students
                    if (student, criterion.criterion_id) not in seen
                ]
                if missing:
                    raise ValueError(
                        f"评分项 {criterion.criterion_id} 缺少 {'、'.join(missing)} 的评分行；"
                        "缺考请录入空值，不要删除整行"
                    )

    def criteria_by_id(self) -> dict[str, Criterion]:
        return {
            criterion.criterion_id: criterion
            for target in self.targets
            for criterion in target.criteria
        }

    def scores_for(self, criterion_id: str) -> tuple[ScoreRecord, ...]:
        return tuple(record for record in self.scores if record.criterion_id == criterion_id)
