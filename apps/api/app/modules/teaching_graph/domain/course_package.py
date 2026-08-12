"""结构化课程包导入。

采用新模板后，课程大纲、实验指导书和评分标准表本身就是结构化的，
不需要先经过 AI 抽取——教师填写模板这一步已经是人工决定。
本模块把一份课程包展开成正式图谱的节点与关系草稿，交由 M2 既有的
校验与发布门禁把关。

两条纪律：

- **不静默覆盖**：已存在对象的内容若与导入内容不同，视为冲突并拒绝整批导入，
  由使用者走修订流程，而不是让导入悄悄改写正式事实；
- **可重复导入**：ID 与版本号由编码确定性生成，重复导入同一份内容是空操作。
"""

import hashlib
from dataclasses import dataclass, field
from typing import Any

COURSE_PACKAGE_VERSION = "course-package:v1"
MAX_ID_LENGTH = 160


@dataclass(frozen=True, slots=True)
class PackageSource:
    source_ref_id: str
    material_id: str
    material_version_id: str
    evidence_fragment_id: str
    material: str
    version: str
    coordinate: str

    def as_payload(self) -> dict[str, str]:
        return {
            "sourceRefId": self.source_ref_id,
            "materialId": self.material_id,
            "materialVersionId": self.material_version_id,
            "evidenceFragmentId": self.evidence_fragment_id,
            "material": self.material,
            "version": self.version,
            "coordinate": self.coordinate,
        }


@dataclass(frozen=True, slots=True)
class PackageEntity:
    code: str
    name: str
    definition: str
    source: PackageSource


@dataclass(frozen=True, slots=True)
class PackageAbility:
    code: str
    name: str
    definition: str
    domain: str
    cognitive_level: str
    observable_behaviors: tuple[str, ...]
    source: PackageSource


@dataclass(frozen=True, slots=True)
class PackageIndicator:
    code: str
    name: str
    definition: str
    graduate_outcome_code: str
    ability_codes: tuple[str, ...]
    source: PackageSource


@dataclass(frozen=True, slots=True)
class PackageCourseOutcome:
    code: str
    name: str
    definition: str
    indicator_code: str
    rationale: str
    target_behaviors: tuple[str, ...]
    source: PackageSource


@dataclass(frozen=True, slots=True)
class PackageExperiment:
    code: str
    name: str
    definition: str
    course_outcome_codes: tuple[str, ...]
    ability_codes: tuple[str, ...]
    source: PackageSource


@dataclass(frozen=True, slots=True)
class PackageAssessmentTask:
    code: str
    name: str
    definition: str
    experiment_code: str
    source: PackageSource


@dataclass(frozen=True, slots=True)
class PackageCriterion:
    code: str
    name: str
    definition: str
    task_code: str
    course_outcome_code: str
    ability_code: str
    source: PackageSource


@dataclass(frozen=True, slots=True)
class CoursePackage:
    """一门课程的完整结构化录入。

    ``graduate_outcomes`` / ``indicators`` / ``abilities`` 是专业级共享对象，
    其余按课程编码限定作用域，避免不同课程的同名编码相互覆盖。
    """

    effective_cycle: str
    owner: str
    course: PackageEntity
    graduate_outcomes: tuple[PackageEntity, ...] = ()
    indicators: tuple[PackageIndicator, ...] = ()
    abilities: tuple[PackageAbility, ...] = ()
    course_outcomes: tuple[PackageCourseOutcome, ...] = ()
    experiments: tuple[PackageExperiment, ...] = ()
    assessment_tasks: tuple[PackageAssessmentTask, ...] = ()
    criteria: tuple[PackageCriterion, ...] = ()


class CoursePackageReferenceError(ValueError):
    """课程包内部引用不完整，展开前即可发现。"""

    def __init__(self, problems: tuple[str, ...]) -> None:
        super().__init__("课程包引用不完整")
        self.problems = problems


@dataclass(frozen=True, slots=True)
class CoursePackageConflict:
    entity_kind: str
    object_id: str
    reason: str


@dataclass(frozen=True, slots=True)
class CoursePackageMerge:
    nodes: list[dict[str, Any]] = field(default_factory=list)
    edges: list[dict[str, Any]] = field(default_factory=list)
    added_node_ids: tuple[str, ...] = ()
    added_edge_ids: tuple[str, ...] = ()
    unchanged_node_ids: tuple[str, ...] = ()
    unchanged_edge_ids: tuple[str, ...] = ()
    conflicts: tuple[CoursePackageConflict, ...] = ()


def _bounded_id(value: str) -> str:
    if len(value) <= MAX_ID_LENGTH:
        return value
    digest = hashlib.sha256(value.encode("utf-8")).hexdigest()[:16]
    return f"{value[: MAX_ID_LENGTH - 17]}~{digest}"


def program_node_id(node_type: str, code: str) -> str:
    return _bounded_id(f"{node_type}:{code}")


def course_node_id(node_type: str, course_code: str, code: str) -> str:
    return _bounded_id(f"{node_type}:{course_code}:{code}")


def edge_id(relation: str, source_id: str, target_id: str) -> str:
    return _bounded_id(f"edge:{relation}:{source_id}->{target_id}")


def _node(
    *,
    node_id: str,
    node_type: str,
    code: str,
    name: str,
    definition: str,
    owner: str,
    source: PackageSource,
    capability: dict[str, Any] | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "id": node_id,
        "type": node_type,
        "code": code,
        "name": name,
        "definition": definition,
        "nodeVersionId": _bounded_id(f"node-version:{node_id}:v1"),
        "owner": owner,
        # 导入产物是草稿：发布命令会重新执行全部门禁并置为 effective。
        "status": "draft",
        "version": "v1.0",
        "source": source.as_payload(),
    }
    if capability is not None:
        payload["capability"] = capability
    return payload


def _edge(
    *,
    relation: str,
    source_node: dict[str, Any],
    target_node: dict[str, Any],
    effective_cycle: str,
    source: PackageSource,
    capability_mapping: dict[str, Any] | None = None,
) -> dict[str, Any]:
    identifier = edge_id(relation, source_node["id"], target_node["id"])
    payload: dict[str, Any] = {
        "id": identifier,
        "relation": relation,
        "sourceId": source_node["id"],
        "targetId": target_node["id"],
        "edgeVersionId": _bounded_id(f"edge-version:{identifier}:v1"),
        "sourceNodeVersionId": source_node["nodeVersionId"],
        "targetNodeVersionId": target_node["nodeVersionId"],
        "effectiveCycle": effective_cycle,
        "reviewStatus": "pending",
        "status": "draft",
        "source": source.as_payload(),
    }
    if capability_mapping is not None:
        payload["capabilityMapping"] = capability_mapping
    return payload


def _validate_references(package: CoursePackage) -> None:
    problems: list[str] = []
    outcome_codes = {item.code for item in package.graduate_outcomes}
    indicator_codes = {item.code for item in package.indicators}
    ability_codes = {item.code for item in package.abilities}
    course_outcome_codes = {item.code for item in package.course_outcomes}
    experiment_codes = {item.code for item in package.experiments}
    task_codes = {item.code for item in package.assessment_tasks}

    for indicator in package.indicators:
        if indicator.graduate_outcome_code not in outcome_codes:
            problems.append(f"指标点 {indicator.code} 引用了不存在的毕业要求")
        for code in indicator.ability_codes:
            if code not in ability_codes:
                problems.append(f"指标点 {indicator.code} 引用了不存在的能力 {code}")
    for outcome in package.course_outcomes:
        if outcome.indicator_code not in indicator_codes:
            problems.append(f"课程目标 {outcome.code} 引用了不存在的指标点")
    for experiment in package.experiments:
        for code in experiment.course_outcome_codes:
            if code not in course_outcome_codes:
                problems.append(f"实验 {experiment.code} 引用了不存在的课程目标 {code}")
        for code in experiment.ability_codes:
            if code not in ability_codes:
                problems.append(f"实验 {experiment.code} 引用了不存在的能力 {code}")
    for task in package.assessment_tasks:
        if task.experiment_code not in experiment_codes:
            problems.append(f"考核任务 {task.code} 引用了不存在的实验")
    for criterion in package.criteria:
        if criterion.task_code not in task_codes:
            problems.append(f"评分项 {criterion.code} 引用了不存在的考核任务")
        if criterion.course_outcome_code not in course_outcome_codes:
            problems.append(f"评分项 {criterion.code} 引用了不存在的课程目标")
        if criterion.ability_code not in ability_codes:
            problems.append(f"评分项 {criterion.code} 引用了不存在的能力")

    if problems:
        raise CoursePackageReferenceError(tuple(dict.fromkeys(problems)))


def build_course_package_objects(
    package: CoursePackage,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """把课程包展开为图谱节点与关系。

    展开覆盖发布门禁要求的全部对齐路径：指标点支撑、实验教学覆盖、
    能力培养路径、直接评价与数值归集。
    """
    _validate_references(package)

    cycle = package.effective_cycle
    owner = package.owner
    course_code = package.course.code
    nodes: dict[str, dict[str, Any]] = {}
    edges: list[dict[str, Any]] = []

    course_node = _node(
        node_id=program_node_id("course", course_code),
        node_type="course",
        code=course_code,
        name=package.course.name,
        definition=package.course.definition,
        owner=owner,
        source=package.course.source,
    )
    nodes[course_node["id"]] = course_node

    for graduate_outcome in package.graduate_outcomes:
        node = _node(
            node_id=program_node_id("graduate-outcome", graduate_outcome.code),
            node_type="graduate-outcome",
            code=graduate_outcome.code,
            name=graduate_outcome.name,
            definition=graduate_outcome.definition,
            owner=owner,
            source=graduate_outcome.source,
        )
        nodes[node["id"]] = node

    for ability in package.abilities:
        node = _node(
            node_id=program_node_id("ability", ability.code),
            node_type="ability",
            code=ability.code,
            name=ability.name,
            definition=ability.definition,
            owner=owner,
            source=ability.source,
            capability={
                "domain": ability.domain,
                "cognitiveLevel": ability.cognitive_level,
                "observableBehaviors": list(ability.observable_behaviors),
            },
        )
        nodes[node["id"]] = node

    for indicator in package.indicators:
        node = _node(
            node_id=program_node_id("performance-indicator", indicator.code),
            node_type="performance-indicator",
            code=indicator.code,
            name=indicator.name,
            definition=indicator.definition,
            owner=owner,
            source=indicator.source,
        )
        nodes[node["id"]] = node
        edges.append(
            _edge(
                relation="refines",
                source_node=nodes[
                    program_node_id("graduate-outcome", indicator.graduate_outcome_code)
                ],
                target_node=node,
                effective_cycle=cycle,
                source=indicator.source,
            )
        )
        for ability_code in indicator.ability_codes:
            edges.append(
                _edge(
                    relation="expects",
                    source_node=node,
                    target_node=nodes[program_node_id("ability", ability_code)],
                    effective_cycle=cycle,
                    source=indicator.source,
                )
            )

    for outcome in package.course_outcomes:
        node = _node(
            node_id=course_node_id("course-outcome", course_code, outcome.code),
            node_type="course-outcome",
            code=outcome.code,
            name=outcome.name,
            definition=outcome.definition,
            owner=owner,
            source=outcome.source,
        )
        nodes[node["id"]] = node
        edges.append(
            _edge(
                relation="defines",
                source_node=course_node,
                target_node=node,
                effective_cycle=cycle,
                source=outcome.source,
            )
        )
        edges.append(
            _edge(
                relation="supports",
                source_node=node,
                target_node=nodes[
                    program_node_id("performance-indicator", outcome.indicator_code)
                ],
                effective_cycle=cycle,
                source=outcome.source,
                capability_mapping={
                    "rationale": outcome.rationale,
                    "targetBehaviors": list(outcome.target_behaviors),
                },
            )
        )

    for experiment in package.experiments:
        node = _node(
            node_id=course_node_id("experiment", course_code, experiment.code),
            node_type="experiment",
            code=experiment.code,
            name=experiment.name,
            definition=experiment.definition,
            owner=owner,
            source=experiment.source,
        )
        nodes[node["id"]] = node
        edges.append(
            _edge(
                relation="belongs-to",
                source_node=node,
                target_node=course_node,
                effective_cycle=cycle,
                source=experiment.source,
            )
        )
        for outcome_code in experiment.course_outcome_codes:
            edges.append(
                _edge(
                    relation="contributes-to",
                    source_node=node,
                    target_node=nodes[
                        course_node_id("course-outcome", course_code, outcome_code)
                    ],
                    effective_cycle=cycle,
                    source=experiment.source,
                )
            )
        for ability_code in experiment.ability_codes:
            edges.append(
                _edge(
                    relation="cultivates",
                    source_node=node,
                    target_node=nodes[program_node_id("ability", ability_code)],
                    effective_cycle=cycle,
                    source=experiment.source,
                )
            )

    for task in package.assessment_tasks:
        node = _node(
            node_id=course_node_id("assessment-task", course_code, task.code),
            node_type="assessment-task",
            code=task.code,
            name=task.name,
            definition=task.definition,
            owner=owner,
            source=task.source,
        )
        nodes[node["id"]] = node
        edges.append(
            _edge(
                relation="contains-task",
                source_node=nodes[
                    course_node_id("experiment", course_code, task.experiment_code)
                ],
                target_node=node,
                effective_cycle=cycle,
                source=task.source,
            )
        )

    for criterion in package.criteria:
        node = _node(
            node_id=course_node_id("rubric-criterion", course_code, criterion.code),
            node_type="rubric-criterion",
            code=criterion.code,
            name=criterion.name,
            definition=criterion.definition,
            owner=owner,
            source=criterion.source,
        )
        nodes[node["id"]] = node
        edges.append(
            _edge(
                relation="contains-criterion",
                source_node=nodes[
                    course_node_id("assessment-task", course_code, criterion.task_code)
                ],
                target_node=node,
                effective_cycle=cycle,
                source=criterion.source,
            )
        )
        # ASSESSES 与 CONTRIBUTES_TO 独立存在：前者是评价效度，后者是聚合路径。
        edges.append(
            _edge(
                relation="assesses",
                source_node=node,
                target_node=nodes[program_node_id("ability", criterion.ability_code)],
                effective_cycle=cycle,
                source=criterion.source,
            )
        )
        edges.append(
            _edge(
                relation="contributes-to",
                source_node=node,
                target_node=nodes[
                    course_node_id(
                        "course-outcome", course_code, criterion.course_outcome_code
                    )
                ],
                effective_cycle=cycle,
                source=criterion.source,
            )
        )

    return list(nodes.values()), edges


def _comparable(payload: dict[str, Any], ignore: tuple[str, ...]) -> dict[str, Any]:
    return {key: value for key, value in payload.items() if key not in ignore}


def merge_course_package(
    state: dict[str, Any],
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]],
) -> CoursePackageMerge:
    """把展开结果并入现有草稿。

    已存在且内容一致的对象跳过；内容不一致的记为冲突并且**不写入**，
    因为覆盖正式事实必须走修订与审核，而不是一次导入。
    """
    existing_nodes = {item["id"]: item for item in state.get("nodes", [])}
    existing_edges = {item["id"]: item for item in state.get("edges", [])}
    merged_nodes = list(state.get("nodes", []))
    merged_edges = list(state.get("edges", []))

    conflicts: list[CoursePackageConflict] = []
    added_nodes: list[str] = []
    added_edges: list[str] = []
    unchanged_nodes: list[str] = []
    unchanged_edges: list[str] = []

    for node in nodes:
        current = existing_nodes.get(node["id"])
        if current is None:
            merged_nodes.append(node)
            added_nodes.append(node["id"])
            continue
        # status/version 由图谱生命周期管理，不参与导入内容比对。
        ignore = ("status", "version", "nodeVersionId")
        if _comparable(current, ignore) == _comparable(node, ignore):
            unchanged_nodes.append(node["id"])
        else:
            conflicts.append(
                CoursePackageConflict(
                    entity_kind="node",
                    object_id=node["id"],
                    reason="已存在同名对象且内容不同，需要走图谱修订而不是重新导入",
                )
            )

    for edge in edges:
        current = existing_edges.get(edge["id"])
        if current is None:
            merged_edges.append(edge)
            added_edges.append(edge["id"])
            continue
        ignore = ("status", "reviewStatus", "edgeVersionId")
        if _comparable(current, ignore) == _comparable(edge, ignore):
            unchanged_edges.append(edge["id"])
        else:
            conflicts.append(
                CoursePackageConflict(
                    entity_kind="edge",
                    object_id=edge["id"],
                    reason="已存在同名关系且内容不同，需要走图谱修订而不是重新导入",
                )
            )

    if conflicts:
        return CoursePackageMerge(conflicts=tuple(conflicts))

    return CoursePackageMerge(
        nodes=merged_nodes,
        edges=merged_edges,
        added_node_ids=tuple(added_nodes),
        added_edge_ids=tuple(added_edges),
        unchanged_node_ids=tuple(unchanged_nodes),
        unchanged_edge_ids=tuple(unchanged_edges),
    )


__all__ = [
    "COURSE_PACKAGE_VERSION",
    "CoursePackage",
    "CoursePackageConflict",
    "CoursePackageMerge",
    "CoursePackageReferenceError",
    "PackageAbility",
    "PackageAssessmentTask",
    "PackageCourseOutcome",
    "PackageCriterion",
    "PackageEntity",
    "PackageExperiment",
    "PackageIndicator",
    "PackageSource",
    "build_course_package_objects",
    "course_node_id",
    "edge_id",
    "merge_course_package",
    "program_node_id",
]
