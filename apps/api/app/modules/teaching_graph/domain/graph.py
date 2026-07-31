from copy import deepcopy
from dataclasses import dataclass
from datetime import datetime
from typing import Any

GraphState = dict[str, Any]
CURRENT_GRAPH_SCHEMA_VERSION_ID = "teaching-graph-schema@2"


@dataclass(frozen=True)
class GraphWorkspace:
    revision: int
    state: GraphState
    updated_at: datetime
    updated_by: str


@dataclass(frozen=True)
class GraphAuditEvent:
    id: str
    action: str
    actor: str
    graph_version: str
    revision: int
    summary: str
    created_at: datetime


RELATION_ENDPOINT_PAIRS: dict[str, set[tuple[str, str]]] = {
    "refines": {("graduate-outcome", "performance-indicator")},
    "expects": {("performance-indicator", "ability")},
    "defines": {("course", "course-outcome")},
    "belongs-to": {("experiment", "course")},
    "supports": {("course-outcome", "performance-indicator")},
    "contributes-to": {
        ("experiment", "course-outcome"),
        ("rubric-criterion", "course-outcome"),
    },
    "cultivates": {("experiment", "ability")},
    "trains": {("experiment", "skill")},
    "covers": {("experiment", "knowledge")},
    "composed-of": {("ability", "skill")},
    "requires": {("skill", "knowledge")},
    "uses": {("experiment", "teaching-resource")},
    "enables": {
        ("teaching-resource", "skill"),
        ("teaching-resource", "knowledge"),
    },
    "contains-task": {("experiment", "assessment-task")},
    "contains-criterion": {("assessment-task", "rubric-criterion")},
    "assesses": {
        ("rubric-criterion", "ability"),
        ("rubric-criterion", "skill"),
    },
}

NODE_DIFF_FIELDS = (
    "nodeVersionId",
    "name",
    "definition",
    "type",
    "owner",
    "version",
)
EDGE_DIFF_FIELDS = (
    "edgeVersionId",
    "relation",
    "sourceId",
    "sourceNodeVersionId",
    "targetId",
    "targetNodeVersionId",
    "effectiveCycle",
    "reviewStatus",
)
SOURCE_DIFF_FIELDS = (
    "sourceRefId",
    "materialId",
    "materialVersionId",
    "evidenceFragmentId",
    "material",
    "version",
    "coordinate",
)


def _working(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [item for item in items if item["status"] != "superseded"]


def _complete_source(item: dict[str, Any]) -> bool:
    source = item["source"]
    values = [str(source.get(field, "")).strip() for field in SOURCE_DIFF_FIELDS]
    return bool(
        all(values)
        and not any(value.startswith("migration-missing:") for value in values)
        and not any(value.startswith("[待补充]") for value in values)
    )


def _complete_capability(node: dict[str, Any]) -> bool:
    capability = node.get("capability")
    return bool(
        isinstance(capability, dict)
        and str(capability.get("domain", "")).strip()
        and str(capability.get("cognitiveLevel", "")).strip()
        and any(
            str(behavior).strip()
            for behavior in capability.get("observableBehaviors", [])
        )
    )


def _canonical_node(node: dict[str, Any]) -> tuple[Any, ...]:
    source = node["source"]
    capability = node.get("capability") or {}
    return (
        *(node.get(field) for field in NODE_DIFF_FIELDS),
        capability.get("domain"),
        capability.get("cognitiveLevel"),
        tuple(capability.get("observableBehaviors", [])),
        *(source.get(field) for field in SOURCE_DIFF_FIELDS),
    )


def _canonical_edge(edge: dict[str, Any]) -> tuple[Any, ...]:
    source = edge["source"]
    capability_mapping = edge.get("capabilityMapping") or {}
    return (
        *(edge.get(field) for field in EDGE_DIFF_FIELDS),
        capability_mapping.get("rationale"),
        tuple(capability_mapping.get("targetBehaviors", [])),
        *(source.get(field) for field in SOURCE_DIFF_FIELDS),
    )


def _baseline(state: GraphState) -> dict[str, Any] | None:
    version = state["version"]
    target = version.get("baseVersion") if version["status"] == "draft" else version["name"]
    return next(
        (
            snapshot
            for snapshot in state["publishedSnapshots"]
            if snapshot["version"] == target
        ),
        None,
    )


def _changes(state: GraphState) -> list[tuple[str, str]]:
    baseline = _baseline(state)
    if state["version"]["status"] == "published" or baseline is None:
        return []

    before_nodes = {item["id"]: item for item in _working(baseline["nodes"])}
    after_nodes = {item["id"]: item for item in _working(state["nodes"])}
    before_edges = {item["id"]: item for item in _working(baseline["edges"])}
    after_edges = {item["id"]: item for item in _working(state["edges"])}
    changes: list[tuple[str, str]] = []

    for entity_id in before_nodes.keys() | after_nodes.keys():
        before = before_nodes.get(entity_id)
        after = after_nodes.get(entity_id)
        if before is None or after is None or _canonical_node(before) != _canonical_node(after):
            changes.append(("node", entity_id))

    for entity_id in before_edges.keys() | after_edges.keys():
        before = before_edges.get(entity_id)
        after = after_edges.get(entity_id)
        if before is None or after is None or _canonical_edge(before) != _canonical_edge(after):
            changes.append(("edge", entity_id))

    return changes


def _impacted_reference_ids(
    state: GraphState, changes: list[tuple[str, str]]
) -> set[str]:
    baseline = _baseline(state)
    before_edges = {
        edge["id"]: edge for edge in (baseline["edges"] if baseline is not None else [])
    }
    after_edges = {edge["id"]: edge for edge in state["edges"]}
    impacted: set[str] = set()

    for reference in state["downstreamReferences"]:
        node_ids = set(reference["nodeIds"])
        edge_ids = set(reference["edgeIds"])
        for entity_kind, entity_id in changes:
            if entity_kind == "node" and entity_id in node_ids:
                impacted.add(reference["id"])
                break
            if entity_kind == "edge":
                if entity_id in edge_ids:
                    impacted.add(reference["id"])
                    break
                edge = after_edges.get(entity_id) or before_edges.get(entity_id)
                if edge and (
                    edge["sourceId"] in node_ids or edge["targetId"] in node_ids
                ):
                    impacted.add(reference["id"])
                    break
    return impacted


def _alignment_flags(
    state: GraphState,
) -> dict[str, tuple[bool, bool, bool, bool]]:
    nodes = {node["id"]: node for node in _working(state["nodes"])}
    edges = _working(state["edges"])
    outcomes = [
        node for node in nodes.values() if node["type"] == "course-outcome"
    ]
    result: dict[str, tuple[bool, bool, bool, bool]] = {}

    for outcome in outcomes:
        outcome_id = outcome["id"]
        indicator_ids = {
            edge["targetId"]
            for edge in edges
            if edge["relation"] == "supports" and edge["sourceId"] == outcome_id
        }
        refined_indicator_ids = {
            edge["targetId"]
            for edge in edges
            if edge["relation"] == "refines"
        }
        expected_ability_ids = {
            edge["targetId"]
            for edge in edges
            if edge["relation"] == "expects"
            and edge["sourceId"] in indicator_ids
        }
        experiment_ids = {
            edge["sourceId"]
            for edge in edges
            if edge["relation"] == "contributes-to"
            and edge["targetId"] == outcome_id
            and nodes.get(edge["sourceId"], {}).get("type") == "experiment"
        }
        cultivated_ability_ids = {
            edge["targetId"]
            for edge in edges
            if edge["relation"] == "cultivates"
            and edge["sourceId"] in experiment_ids
        }
        required_skill_ids_by_ability = {
            ability_id: {
                edge["targetId"]
                for edge in edges
                if edge["relation"] == "composed-of"
                and edge["sourceId"] == ability_id
                and nodes.get(edge["targetId"], {}).get("type") == "skill"
            }
            for ability_id in expected_ability_ids
        }
        task_ids = {
            edge["targetId"]
            for edge in edges
            if edge["relation"] == "contains-task"
            and edge["sourceId"] in experiment_ids
        }
        criterion_ids = {
            edge["targetId"]
            for edge in edges
            if edge["relation"] == "contains-criterion"
            and edge["sourceId"] in task_ids
        }
        assessed_targets_by_criterion = {
            criterion_id: {
                edge["targetId"]
                for edge in edges
                if edge["relation"] == "assesses"
                and edge["sourceId"] == criterion_id
            }
            for criterion_id in criterion_ids
        }
        assessed_criterion_ids = {
            criterion_id
            for criterion_id, target_ids in assessed_targets_by_criterion.items()
            if any(
                ability_id in target_ids
                or bool(required_skill_ids_by_ability[ability_id] & target_ids)
                for ability_id in expected_ability_ids
            )
        }
        aggregated_criterion_ids = {
            edge["sourceId"]
            for edge in edges
            if edge["relation"] == "contributes-to"
            and edge["targetId"] == outcome_id
            and nodes.get(edge["sourceId"], {}).get("type") == "rubric-criterion"
        }
        every_ability_assessed = bool(expected_ability_ids) and all(
            any(
                ability_id in target_ids
                or bool(required_skill_ids_by_ability[ability_id] & target_ids)
                for target_ids in assessed_targets_by_criterion.values()
            )
            for ability_id in expected_ability_ids
        )
        result[outcome["code"]] = (
            bool(indicator_ids) and indicator_ids <= refined_indicator_ids,
            bool(experiment_ids),
            bool(expected_ability_ids)
            and expected_ability_ids <= cultivated_ability_ids,
            every_ability_assessed
            and bool(assessed_criterion_ids)
            and assessed_criterion_ids <= aggregated_criterion_ids,
        )

    return result


def _structural_issues(state: GraphState) -> list[str]:
    working_nodes = _working(state["nodes"])
    nodes: dict[str, dict[str, Any]] = {}
    node_version_ids: set[str] = set()
    working_edges = _working(state["edges"])
    edge_ids: set[str] = set()
    edge_version_ids: set[str] = set()
    signatures: set[tuple[str, str, str]] = set()
    issues: list[str] = []

    for node in working_nodes:
        if node["id"] in nodes:
            issues.append(f"{node['id']}:duplicate-node")
        nodes[node["id"]] = node
        if node["nodeVersionId"] in node_version_ids:
            issues.append(f"{node['nodeVersionId']}:duplicate-node-version")
        node_version_ids.add(node["nodeVersionId"])
        if node["type"] not in {"ability", "skill"} and node.get("capability"):
            issues.append(f"{node['id']}:unexpected-capability-semantics")

    for edge in working_edges:
        if edge["id"] in edge_ids:
            issues.append(f"{edge['id']}:duplicate-edge-id")
        edge_ids.add(edge["id"])
        if edge["edgeVersionId"] in edge_version_ids:
            issues.append(f"{edge['edgeVersionId']}:duplicate-edge-version")
        edge_version_ids.add(edge["edgeVersionId"])

        source = nodes.get(edge["sourceId"])
        target = nodes.get(edge["targetId"])
        allowed_pairs = RELATION_ENDPOINT_PAIRS.get(edge["relation"])
        if source is None or target is None or allowed_pairs is None:
            issues.append(f"{edge['id']}:missing-node")
            continue
        if source["id"] == target["id"]:
            issues.append(f"{edge['id']}:self-edge")
        if (source["type"], target["type"]) not in allowed_pairs:
            issues.append(f"{edge['id']}:invalid-endpoint-types")
        if edge["sourceNodeVersionId"] != source["nodeVersionId"]:
            issues.append(f"{edge['id']}:stale-source-node-version")
        if edge["targetNodeVersionId"] != target["nodeVersionId"]:
            issues.append(f"{edge['id']}:stale-target-node-version")

        mapping = edge.get("capabilityMapping")
        if edge["relation"] == "supports" and not isinstance(mapping, dict):
            issues.append(f"{edge['id']}:missing-capability-mapping")
        if edge["relation"] == "supports" and isinstance(mapping, dict):
            if not (
                str(mapping.get("rationale", "")).strip()
                and mapping.get("targetBehaviors")
            ):
                issues.append(f"{edge['id']}:missing-capability-mapping")
            else:
                ability_ids = {
                    candidate["targetId"]
                    for candidate in working_edges
                    if candidate["relation"] == "expects"
                    and candidate["sourceId"] == target["id"]
                }
                allowed_behaviors = {
                    behavior
                    for ability_id in ability_ids
                    for behavior in (
                        nodes.get(ability_id, {}).get("capability") or {}
                    ).get("observableBehaviors", [])
                }
                if any(
                    behavior not in allowed_behaviors
                    for behavior in mapping["targetBehaviors"]
                ):
                    issues.append(f"{edge['id']}:unknown-capability-behavior")
        if edge["relation"] != "supports" and mapping is not None:
            issues.append(f"{edge['id']}:unexpected-capability-mapping")

        signature = (edge["relation"], edge["sourceId"], edge["targetId"])
        if signature in signatures:
            issues.append(f"{edge['id']}:duplicate-edge")
        signatures.add(signature)

    return issues


def _schema_issues(state: GraphState) -> list[str]:
    working_nodes = _working(state["nodes"])
    nodes = {node["id"]: node for node in working_nodes}
    working_edges = _working(state["edges"])
    issues = _structural_issues(state)

    for node in working_nodes:
        if not _complete_source(node):
            issues.append(f"{node['id']}:missing-source")
    for edge in working_edges:
        if not _complete_source(edge):
            issues.append(f"{edge['id']}:missing-source")

    snapshots_by_version = {
        snapshot["version"]: snapshot for snapshot in state["publishedSnapshots"]
    }
    for reference in state["downstreamReferences"]:
        snapshot = snapshots_by_version.get(reference["graphVersion"])
        if snapshot is None:
            issues.append(f"{reference['id']}:missing-published-snapshot")
            continue
        if reference["schemaVersionId"] != snapshot["schemaVersionId"]:
            issues.append(f"{reference['id']}:schema-version-mismatch")
        snapshot_node_version_ids = {
            node["nodeVersionId"] for node in snapshot["nodes"]
        }
        snapshot_edge_version_ids = {
            edge["edgeVersionId"] for edge in snapshot["edges"]
        }
        reference_node_version_ids = set(reference["nodeVersionIds"])
        reference_edge_version_ids = set(reference["edgeVersionIds"])
        if not reference_node_version_ids <= snapshot_node_version_ids:
            issues.append(f"{reference['id']}:unknown-node-version")
        if not reference_edge_version_ids <= snapshot_edge_version_ids:
            issues.append(f"{reference['id']}:unknown-edge-version")
        bound_node_ids = {
            node["id"]
            for node in snapshot["nodes"]
            if node["nodeVersionId"] in reference_node_version_ids
        }
        bound_edge_ids = {
            edge["id"]
            for edge in snapshot["edges"]
            if edge["edgeVersionId"] in reference_edge_version_ids
        }
        if set(reference["nodeIds"]) != bound_node_ids:
            issues.append(f"{reference['id']}:node-version-binding-mismatch")
        if set(reference["edgeIds"]) != bound_edge_ids:
            issues.append(f"{reference['id']}:edge-version-binding-mismatch")

    course_ids_by_outcome: dict[str, list[str]] = {}
    course_ids_by_experiment: dict[str, list[str]] = {}
    for edge in working_edges:
        if edge["relation"] == "defines":
            course_ids_by_outcome.setdefault(edge["targetId"], []).append(
                edge["sourceId"]
            )
        if edge["relation"] == "belongs-to":
            course_ids_by_experiment.setdefault(edge["sourceId"], []).append(
                edge["targetId"]
            )

    for node in working_nodes:
        owners: list[str] | None = None
        if node["type"] == "course-outcome":
            owners = course_ids_by_outcome.get(node["id"], [])
        if node["type"] == "experiment":
            owners = course_ids_by_experiment.get(node["id"], [])
        if owners is not None and len(owners) != 1:
            issues.append(f"{node['id']}:invalid-course-ownership")

    outcome_course_by_id = {
        outcome_id: course_ids[0]
        for outcome_id, course_ids in course_ids_by_outcome.items()
        if len(course_ids) == 1
    }
    experiment_course_by_id = {
        experiment_id: course_ids[0]
        for experiment_id, course_ids in course_ids_by_experiment.items()
        if len(course_ids) == 1
    }
    for edge in working_edges:
        source = nodes.get(edge["sourceId"])
        if (
            edge["relation"] == "contributes-to"
            and source is not None
            and source["type"] == "experiment"
            and experiment_course_by_id.get(edge["sourceId"])
            != outcome_course_by_id.get(edge["targetId"])
        ):
            issues.append(f"{edge['id']}:cross-course-contribution")

    return issues


def get_publish_blockers(state: GraphState) -> list[str]:
    if state["version"]["status"] != "draft":
        return ["当前图谱不是可发布草稿"]

    blockers: list[str] = []
    if _schema_issues(state):
        blockers.append("图谱 Schema 未通过")

    capability_nodes = [
        node
        for node in _working(state["nodes"])
        if node["type"] in {"ability", "skill"}
    ]
    nodes_without_semantics = [
        node["code"]
        for node in capability_nodes
        if not _complete_capability(node)
    ]
    if nodes_without_semantics:
        blockers.append(
            f"{'、'.join(nodes_without_semantics)} 缺少完整能力语义"
        )

    alignments = _alignment_flags(state)
    unsupported = [code for code, flags in alignments.items() if not flags[0]]
    untaught = [code for code, flags in alignments.items() if not flags[1]]
    uncultivated = [code for code, flags in alignments.items() if not flags[2]]
    unassessed = [code for code, flags in alignments.items() if not flags[3]]
    if unsupported:
        blockers.append(f"{'、'.join(unsupported)} 缺少完整指标点支撑")
    if untaught:
        blockers.append(f"{'、'.join(untaught)} 缺少实验教学覆盖")
    if uncultivated:
        blockers.append(f"{'、'.join(uncultivated)} 缺少能力培养路径")
    if unassessed:
        blockers.append(f"{'、'.join(unassessed)} 缺少直接评价或数值归集路径")

    if _baseline(state) is None:
        blockers.append("找不到正式版本基线")
        return blockers

    changes = _changes(state)
    if not changes:
        blockers.append("当前草稿与正式基线无实际差异")

    version = state["version"]["name"]
    reviewed = {
        decision["changeId"]
        for decision in state["changeReviews"]
        if decision["draftVersion"] == version
    }
    unreviewed = [
        f"{entity_kind}:{entity_id}"
        for entity_kind, entity_id in changes
        if f"{entity_kind}:{entity_id}" not in reviewed
    ]
    if unreviewed:
        blockers.append(f"{len(unreviewed)} 项变更尚未逐项审核")

    impacted = _impacted_reference_ids(state, changes)
    resolved = {
        decision["referenceId"]
        for decision in state["impactDecisions"]
        if decision["draftVersion"] == version
    }
    unresolved = impacted - resolved
    if unresolved:
        blockers.append(f"{len(unresolved)} 个下游对象尚未处置")

    pending_edges = [
        edge for edge in _working(state["edges"]) if edge["reviewStatus"] != "approved"
    ]
    if pending_edges:
        blockers.append(f"{len(pending_edges)} 条关系尚未审核通过")
    return blockers


def validate_draft_transition(
    current: GraphWorkspace | None, requested_state: GraphState
) -> list[str]:
    if (
        requested_state.get("schemaVersionId")
        != CURRENT_GRAPH_SCHEMA_VERSION_ID
    ):
        return ["只能保存当前图谱 Schema"]
    structural_issues = _structural_issues(requested_state)
    if structural_issues:
        return [
            f"图谱结构不变量未通过：{issue}"
            for issue in structural_issues
        ]
    if requested_state["version"]["status"] != "draft":
        return ["草稿保存接口不能创建正式版本"]
    if current is None:
        baseline = _baseline(requested_state)
        if baseline is None:
            return ["首次初始化必须包含草稿绑定的正式基线"]
        if baseline["schemaVersionId"] != requested_state["schemaVersionId"]:
            return ["草稿与正式基线必须使用同一图谱 Schema"]
        return []
    if current.state["version"]["status"] == "published":
        return ["正式快照必须通过创建修订接口进入下一草稿"]
    if requested_state["version"] != current.state["version"]:
        return ["草稿保存不能改变图谱版本身份"]
    if requested_state["schemaVersionId"] != current.state["schemaVersionId"]:
        return ["草稿保存不能改变图谱 Schema 版本"]
    if requested_state["publishedSnapshots"] != current.state["publishedSnapshots"]:
        return ["正式快照不可由客户端改写"]
    return []


def publish_graph_state(state: GraphState, published_at: datetime) -> GraphState:
    published = deepcopy(state)
    published["nodes"] = [
        {
            **node,
            "status": "effective" if node["status"] == "draft" else node["status"],
        }
        for node in state["nodes"]
    ]
    published["edges"] = [
        (
            edge
            if edge["status"] == "superseded"
            else {**edge, "status": "effective", "reviewStatus": "approved"}
        )
        for edge in state["edges"]
    ]
    published["version"] = {
        "name": state["version"]["name"],
        "status": "published",
    }
    snapshot = {
        "version": state["version"]["name"],
        "schemaVersionId": state["schemaVersionId"],
        "publishedAt": published_at.isoformat(),
        "nodes": [
            deepcopy(node)
            for node in published["nodes"]
            if node["status"] != "superseded"
        ],
        "edges": [
            deepcopy(edge)
            for edge in published["edges"]
            if edge["status"] != "superseded"
        ],
    }
    published["publishedSnapshots"] = [
        item
        for item in state["publishedSnapshots"]
        if item["version"] != snapshot["version"]
    ] + [snapshot]
    return published


def get_next_graph_version(version_name: str) -> str:
    prefix, separator, minor = version_name.partition(".")
    if separator and prefix.startswith("v") and prefix[1:].isdigit() and minor.isdigit():
        return f"{prefix}.{int(minor) + 1}"
    return f"{version_name}-next"


def start_graph_revision(state: GraphState) -> GraphState:
    revised = deepcopy(state)
    current_version = state["version"]["name"]
    revised["version"] = {
        "name": get_next_graph_version(current_version),
        "baseVersion": current_version,
        "status": "draft",
    }
    return revised
