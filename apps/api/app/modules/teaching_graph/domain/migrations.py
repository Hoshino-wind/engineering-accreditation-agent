import json
from copy import deepcopy
from dataclasses import dataclass
from datetime import datetime
from hashlib import sha256
from typing import Any

from app.modules.teaching_graph.domain.graph import (
    CURRENT_GRAPH_SCHEMA_VERSION_ID,
    RELATION_ENDPOINT_PAIRS,
    GraphState,
    GraphWorkspace,
)

LEGACY_GRAPH_SCHEMA_VERSION_IDS = frozenset({"ability-graph-schema:v1"})

_NODE_TYPES = {
    "graduate-outcome",
    "performance-indicator",
    "course",
    "course-outcome",
    "ability",
    "skill",
    "knowledge",
    "experiment",
    "teaching-resource",
    "assessment-task",
    "rubric-criterion",
}
_CAPABILITY_LEVELS = {
    "understand",
    "apply",
    "analyze",
    "evaluate",
    "create",
}


@dataclass(frozen=True)
class _MigratedPayload:
    nodes: list[dict[str, Any]]
    edges: list[dict[str, Any]]
    node_version_by_id: dict[str, str]
    edge_ids_by_legacy_id: dict[str, list[str]]
    edge_version_by_id: dict[str, str]


class UnsupportedGraphSchemaVersionError(ValueError):
    def __init__(self, schema_version_id: str) -> None:
        self.schema_version_id = schema_version_id
        super().__init__(f"不支持的图谱 Schema：{schema_version_id}")


def _digest(*parts: object) -> str:
    payload = "\x1f".join(
        json.dumps(part, ensure_ascii=False, sort_keys=True, default=str)
        for part in parts
    )
    return sha256(payload.encode("utf-8")).hexdigest()[:16]


def _bounded(value: object, fallback: str, limit: int) -> str:
    normalized = str(value or "").strip() or fallback
    return normalized[:limit]


def _stable_id(prefix: str, *parts: object) -> str:
    return f"{prefix}:{_digest(*parts)}"


def _source_was_complete(source: object) -> bool:
    return bool(
        isinstance(source, dict)
        and str(source.get("material", "")).strip()
        and str(source.get("version", "")).strip()
        and str(source.get("coordinate", "")).strip()
    )


def _normalize_source(source: object, *, context: str) -> dict[str, str]:
    raw = source if isinstance(source, dict) else {}
    material = _bounded(raw.get("material"), "[待补充] 旧版未记录材料", 240)
    version = _bounded(raw.get("version"), "[待补充] 旧版未记录版本", 80)
    coordinate = _bounded(raw.get("coordinate"), "[待补充] 旧版未记录位置", 240)
    complete = _source_was_complete(raw)

    material_id = _bounded(
        raw.get("materialId"),
        _stable_id("material", material),
        160,
    )
    material_version_id = _bounded(
        raw.get("materialVersionId"),
        _stable_id("material-version", material_id, version),
        160,
    )
    evidence_fragment_id = _bounded(
        raw.get("evidenceFragmentId"),
        _stable_id("evidence-fragment", material_version_id, coordinate),
        160,
    )
    default_source_ref_id = _stable_id(
        "source-ref",
        evidence_fragment_id,
        context,
    )
    if not complete:
        default_source_ref_id = _stable_id(
            "migration-missing:source-ref",
            context,
        )

    return {
        "sourceRefId": _bounded(
            raw.get("sourceRefId"),
            default_source_ref_id,
            160,
        ),
        "materialId": material_id,
        "materialVersionId": material_version_id,
        "evidenceFragmentId": evidence_fragment_id,
        "material": material,
        "version": version,
        "coordinate": coordinate,
    }


def _normalize_capability(value: object) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None
    cognitive_level = str(value.get("cognitiveLevel", "")).strip()
    domain = _bounded(value.get("domain"), "", 160)
    raw_behaviors = value.get("observableBehaviors")
    if (
        cognitive_level not in _CAPABILITY_LEVELS
        or not domain
        or not isinstance(raw_behaviors, list)
    ):
        return None
    behaviors = [
        _bounded(behavior, "", 160)
        for behavior in raw_behaviors
        if str(behavior).strip()
    ][:8]
    if not behaviors:
        return None
    return {
        "cognitiveLevel": cognitive_level,
        "domain": domain,
        "observableBehaviors": behaviors,
    }


def _normalize_mapping(value: object) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None
    rationale = _bounded(value.get("rationale"), "", 1000)
    raw_behaviors = value.get("targetBehaviors")
    if not rationale or not isinstance(raw_behaviors, list):
        return None
    behaviors = [
        _bounded(behavior, "", 160)
        for behavior in raw_behaviors
        if str(behavior).strip()
    ][:8]
    if not behaviors:
        return None
    return {
        "rationale": rationale,
        "targetBehaviors": behaviors,
    }


def _with_node_version(node: dict[str, Any], existing_id: object = None) -> dict[str, Any]:
    version_payload = {
        key: value
        for key, value in node.items()
        if key not in {"nodeVersionId", "status"}
    }
    return {
        **node,
        "nodeVersionId": _bounded(
            existing_id,
            _stable_id("node-version", node["id"], version_payload),
            160,
        ),
    }


def _with_edge_version(edge: dict[str, Any], existing_id: object = None) -> dict[str, Any]:
    version_payload = {
        key: value
        for key, value in edge.items()
        if key not in {"edgeVersionId", "status", "reviewStatus"}
    }
    return {
        **edge,
        "edgeVersionId": _bounded(
            existing_id,
            _stable_id("edge-version", edge["id"], version_payload),
            160,
        ),
    }


def _normalize_node(raw_node: dict[str, Any]) -> dict[str, Any] | None:
    node_type = str(raw_node.get("type", "")).strip()
    if node_type not in _NODE_TYPES:
        return None
    identifier = _bounded(
        raw_node.get("id"),
        _stable_id("migration-missing:node", raw_node),
        160,
    )
    source = _normalize_source(
        raw_node.get("source"),
        context=f"node:{identifier}",
    )
    status = str(raw_node.get("status", "draft"))
    if status not in {"effective", "draft", "superseded"}:
        status = "draft"
    node: dict[str, Any] = {
        "id": identifier,
        "code": _bounded(
            raw_node.get("code"),
            f"LEGACY-{_digest(identifier)[:8].upper()}",
            80,
        ),
        "name": _bounded(raw_node.get("name"), "[待补充] 未命名节点", 240),
        "definition": _bounded(
            raw_node.get("definition"),
            "[待补充] 旧版未记录正式定义",
            2000,
        ),
        "type": node_type,
        "status": status,
        "owner": _bounded(raw_node.get("owner"), "[待补充] 待确认责任人", 120),
        "version": _bounded(
            raw_node.get("version"),
            "legacy-unversioned",
            80,
        ),
        "source": source,
        "capability": None,
    }
    if node_type in {"ability", "skill"}:
        capability = _normalize_capability(raw_node.get("capability"))
        if capability is not None:
            node["capability"] = capability
    return _with_node_version(node, raw_node.get("nodeVersionId"))


def _make_course_node(
    course_name: str,
    source_node: dict[str, Any],
) -> dict[str, Any]:
    identifier = _stable_id("course", course_name)
    node = {
        "id": identifier,
        "code": f"COURSE-{_digest(course_name)[:8].upper()}",
        "name": course_name,
        "definition": (
            f"旧版图谱仅记录课程名称“{course_name}”，"
            "正式课程定义与责任边界待人工确认。"
        ),
        "type": "course",
        "status": "draft",
        "owner": source_node["owner"],
        "version": "legacy-migrated",
        "source": deepcopy(source_node["source"]),
        "capability": None,
    }
    return _with_node_version(node)


def _make_ability_node(
    indicator: dict[str, Any],
    legacy_capability: object,
) -> dict[str, Any]:
    capability = _normalize_capability(legacy_capability)
    identifier = _stable_id("ability-from-indicator", indicator["id"])
    if capability is None:
        name = f"{indicator['name']}对应能力（待确认）"
        definition = (
            f"由旧版指标点 {indicator['code']} 迁移生成；"
            "旧数据缺少完整能力语义，需人工补充后方可发布。"
        )
        status = "draft"
    else:
        name = f"{capability['domain']}能力"
        definition = "；".join(capability["observableBehaviors"])
        status = indicator["status"]
    node: dict[str, Any] = {
        "id": identifier,
        "code": _bounded(f"BA-{indicator['code']}", "BA-LEGACY", 80),
        "name": _bounded(name, "待确认能力", 240),
        "definition": _bounded(definition, "待确认能力定义", 2000),
        "type": "ability",
        "status": status,
        "owner": indicator["owner"],
        "version": indicator["version"],
        "source": deepcopy(indicator["source"]),
        "capability": None,
    }
    if capability is not None:
        node["capability"] = capability
    return _with_node_version(node)


def _make_edge(
    *,
    identifier: str,
    relation: str,
    source_node: dict[str, Any],
    target_node: dict[str, Any],
    source: dict[str, str],
    effective_cycle: object,
    status: str,
    review_status: str,
    capability_mapping: dict[str, Any] | None = None,
    existing_version_id: object = None,
) -> dict[str, Any]:
    edge: dict[str, Any] = {
        "id": _bounded(identifier, _stable_id("migration-edge", identifier), 160),
        "relation": relation,
        "sourceId": source_node["id"],
        "sourceNodeVersionId": source_node["nodeVersionId"],
        "targetId": target_node["id"],
        "targetNodeVersionId": target_node["nodeVersionId"],
        "status": status,
        "reviewStatus": review_status,
        "effectiveCycle": _bounded(
            effective_cycle,
            "[待补充] 旧版未记录生效周期",
            120,
        ),
        "source": deepcopy(source),
        "capabilityMapping": capability_mapping,
    }
    return _with_edge_version(edge, existing_version_id)


def _migrated_edge_id(
    legacy_id: str,
    relation: str,
    source_id: str,
    target_id: str,
) -> str:
    return _stable_id(
        "migration-edge",
        legacy_id,
        relation,
        source_id,
        target_id,
    )


def _migrate_payload(
    raw_nodes: object,
    raw_edges: object,
) -> _MigratedPayload:
    legacy_nodes = [
        item for item in raw_nodes if isinstance(item, dict)
    ] if isinstance(raw_nodes, list) else []
    legacy_edges = [
        item for item in raw_edges if isinstance(item, dict)
    ] if isinstance(raw_edges, list) else []

    course_name_by_node_id = {
        str(item.get("id", "")): str(item.get("course", "")).strip()
        for item in legacy_nodes
        if item.get("course") is not None
        and str(item.get("course", "")).strip()
    }
    legacy_capability_by_indicator_id = {
        str(item.get("id", "")): item.get("capability")
        for item in legacy_nodes
        if item.get("type") == "performance-indicator"
    }

    nodes = [
        normalized
        for item in legacy_nodes
        if (normalized := _normalize_node(item)) is not None
    ]
    node_by_id = {node["id"]: node for node in nodes}

    course_id_by_name = {
        node["name"]: node["id"]
        for node in nodes
        if node["type"] == "course"
    }
    for course_name in sorted(set(course_name_by_node_id.values())):
        if course_name in course_id_by_name:
            continue
        source_candidates = sorted(
            (
                node_by_id[node_id]
                for node_id, name in course_name_by_node_id.items()
                if name == course_name and node_id in node_by_id
            ),
            key=lambda item: item["id"],
        )
        if not source_candidates:
            continue
        course_node = _make_course_node(course_name, source_candidates[0])
        nodes.append(course_node)
        node_by_id[course_node["id"]] = course_node
        course_id_by_name[course_name] = course_node["id"]

    existing_ability_ids_by_indicator: dict[str, list[str]] = {}
    for edge in legacy_edges:
        if edge.get("relation") != "expects":
            continue
        target = node_by_id.get(str(edge.get("targetId", "")))
        if target is not None and target["type"] == "ability":
            existing_ability_ids_by_indicator.setdefault(
                str(edge.get("sourceId", "")),
                [],
            ).append(target["id"])

    ability_ids_by_indicator: dict[str, list[str]] = {}
    generated_ability_ids: set[str] = set()
    for indicator in sorted(
        (
            node for node in nodes
            if node["type"] == "performance-indicator"
        ),
        key=lambda item: item["id"],
    ):
        existing_ids = existing_ability_ids_by_indicator.get(
            indicator["id"],
            [],
        )
        if existing_ids:
            ability_ids_by_indicator[indicator["id"]] = sorted(set(existing_ids))
            continue
        ability = _make_ability_node(
            indicator,
            legacy_capability_by_indicator_id.get(indicator["id"]),
        )
        nodes.append(ability)
        node_by_id[ability["id"]] = ability
        ability_ids_by_indicator[indicator["id"]] = [ability["id"]]
        generated_ability_ids.add(ability["id"])

    edges: list[dict[str, Any]] = []
    edge_by_signature: dict[tuple[str, str, str], dict[str, Any]] = {}
    edge_ids_by_legacy_id: dict[str, list[str]] = {}
    deferred_assessment_edges: list[dict[str, Any]] = []

    def append_edge(
        edge: dict[str, Any],
        *,
        legacy_id: str | None = None,
    ) -> dict[str, Any]:
        signature = (
            edge["relation"],
            edge["sourceId"],
            edge["targetId"],
        )
        existing = edge_by_signature.get(signature)
        selected = existing or edge
        if existing is None:
            edges.append(edge)
            edge_by_signature[signature] = edge
        if legacy_id is not None:
            mapped_ids = edge_ids_by_legacy_id.setdefault(legacy_id, [])
            if selected["id"] not in mapped_ids:
                mapped_ids.append(selected["id"])
        return selected

    for raw_edge in legacy_edges:
        legacy_id = _bounded(
            raw_edge.get("id"),
            _stable_id("migration-missing:edge", raw_edge),
            160,
        )
        source_id = str(raw_edge.get("sourceId", ""))
        target_id = str(raw_edge.get("targetId", ""))
        source_node = node_by_id.get(source_id)
        target_node = node_by_id.get(target_id)
        relation = str(raw_edge.get("relation", ""))
        if source_node is None or target_node is None:
            continue

        if (
            relation == "assesses"
            and source_node["type"] == "rubric-criterion"
            and target_node["type"] == "course-outcome"
        ):
            deferred_assessment_edges.append(raw_edge)
            continue

        converted = False
        if (
            relation == "contains-experiment"
            and source_node["type"] == "course"
            and target_node["type"] == "experiment"
        ):
            relation = "belongs-to"
            source_node, target_node = target_node, source_node
            converted = True
        elif relation == "supports-capability":
            relation = "enables"
            converted = True
        elif (
            relation == "requires"
            and source_node["type"] == "ability"
            and target_node["type"] == "skill"
        ):
            relation = "composed-of"
            converted = True

        if (
            source_node["type"],
            target_node["type"],
        ) not in RELATION_ENDPOINT_PAIRS.get(relation, set()):
            continue

        source_complete = _source_was_complete(raw_edge.get("source"))
        status = str(raw_edge.get("status", "draft"))
        review_status = str(raw_edge.get("reviewStatus", "pending"))
        if (
            status not in {"effective", "draft", "superseded"}
            or converted
            or not source_complete
        ):
            status = "draft"
        if (
            review_status not in {"approved", "pending"}
            or converted
            or not source_complete
        ):
            review_status = "pending"

        mapping = None
        if relation == "supports":
            mapping = _normalize_mapping(raw_edge.get("capabilityMapping"))
            if mapping is None:
                status = "draft"
                review_status = "pending"

        identifier = (
            _migrated_edge_id(
                legacy_id,
                relation,
                source_node["id"],
                target_node["id"],
            )
            if converted
            else legacy_id
        )
        migrated_edge = _make_edge(
            identifier=identifier,
            relation=relation,
            source_node=source_node,
            target_node=target_node,
            source=_normalize_source(
                raw_edge.get("source"),
                context=f"edge:{legacy_id}",
            ),
            effective_cycle=raw_edge.get("effectiveCycle"),
            status=status,
            review_status=review_status,
            capability_mapping=mapping,
            existing_version_id=(
                None if converted else raw_edge.get("edgeVersionId")
            ),
        )
        append_edge(migrated_edge, legacy_id=legacy_id)

    for node_id, course_name in sorted(course_name_by_node_id.items()):
        node = node_by_id.get(node_id)
        course_id = course_id_by_name.get(course_name)
        course = node_by_id.get(course_id or "")
        if node is None or course is None:
            continue
        derived_relation: str | None = None
        derived_source: dict[str, Any] | None = None
        derived_target: dict[str, Any] | None = None
        if node["type"] == "course-outcome":
            derived_relation = "defines"
            derived_source = course
            derived_target = node
        if node["type"] == "experiment":
            derived_relation = "belongs-to"
            derived_source = node
            derived_target = course
        if (
            derived_relation is None
            or derived_source is None
            or derived_target is None
        ):
            continue
        append_edge(
            _make_edge(
                identifier=_stable_id(
                    "migration-edge",
                    derived_relation,
                    derived_source["id"],
                    derived_target["id"],
                ),
                relation=derived_relation,
                source_node=derived_source,
                target_node=derived_target,
                source=deepcopy(node["source"]),
                effective_cycle="[待确认] 旧版课程归属",
                status="draft",
                review_status="pending",
            )
        )

    for indicator_id, ability_ids in sorted(ability_ids_by_indicator.items()):
        indicator = node_by_id[indicator_id]
        for ability_id in ability_ids:
            ability = node_by_id[ability_id]
            signature = ("expects", indicator_id, ability_id)
            if signature in edge_by_signature:
                continue
            status = (
                indicator["status"]
                if ability_id in generated_ability_ids
                and ability.get("capability") is not None
                else "draft"
            )
            append_edge(
                _make_edge(
                    identifier=_stable_id(
                        "migration-edge",
                        "expects",
                        indicator_id,
                        ability_id,
                    ),
                    relation="expects",
                    source_node=indicator,
                    target_node=ability,
                    source=deepcopy(indicator["source"]),
                    effective_cycle="[待确认] 旧版指标点能力语义",
                    status=status,
                    review_status=(
                        "approved" if status == "effective" else "pending"
                    ),
                )
            )

    supports_by_outcome: dict[str, list[str]] = {}
    for edge in edges:
        if edge["relation"] == "supports":
            supports_by_outcome.setdefault(edge["sourceId"], []).append(
                edge["targetId"]
            )

    for raw_edge in deferred_assessment_edges:
        legacy_id = _bounded(
            raw_edge.get("id"),
            _stable_id("migration-missing:edge", raw_edge),
            160,
        )
        criterion = node_by_id.get(str(raw_edge.get("sourceId", "")))
        outcome = node_by_id.get(str(raw_edge.get("targetId", "")))
        if criterion is None or outcome is None:
            continue
        normalized_source = _normalize_source(
            raw_edge.get("source"),
            context=f"edge:{legacy_id}",
        )
        contribution = append_edge(
            _make_edge(
                identifier=_migrated_edge_id(
                    legacy_id,
                    "contributes-to",
                    criterion["id"],
                    outcome["id"],
                ),
                relation="contributes-to",
                source_node=criterion,
                target_node=outcome,
                source=normalized_source,
                effective_cycle=raw_edge.get("effectiveCycle"),
                status="draft",
                review_status="pending",
            ),
            legacy_id=legacy_id,
        )
        edge_ids_by_legacy_id.setdefault(legacy_id, [])
        if contribution["id"] not in edge_ids_by_legacy_id[legacy_id]:
            edge_ids_by_legacy_id[legacy_id].append(contribution["id"])

        indicator_ids = supports_by_outcome.get(outcome["id"], [])
        ability_ids = sorted(
            {
                ability_id
                for indicator_id in indicator_ids
                for ability_id in ability_ids_by_indicator.get(indicator_id, [])
            }
        )
        for ability_id in ability_ids:
            ability = node_by_id[ability_id]
            assessment = append_edge(
                _make_edge(
                    identifier=_migrated_edge_id(
                        legacy_id,
                        "assesses",
                        criterion["id"],
                        ability_id,
                    ),
                    relation="assesses",
                    source_node=criterion,
                    target_node=ability,
                    source=normalized_source,
                    effective_cycle=raw_edge.get("effectiveCycle"),
                    status="draft",
                    review_status="pending",
                ),
                legacy_id=legacy_id,
            )
            if assessment["id"] not in edge_ids_by_legacy_id[legacy_id]:
                edge_ids_by_legacy_id[legacy_id].append(assessment["id"])

    experiment_contributions = [
        edge
        for edge in edges
        if edge["relation"] == "contributes-to"
        and node_by_id.get(edge["sourceId"], {}).get("type") == "experiment"
    ]
    for contribution in experiment_contributions:
        experiment = node_by_id[contribution["sourceId"]]
        indicator_ids = supports_by_outcome.get(
            contribution["targetId"],
            [],
        )
        ability_ids = sorted(
            {
                ability_id
                for indicator_id in indicator_ids
                for ability_id in ability_ids_by_indicator.get(indicator_id, [])
            }
        )
        for ability_id in ability_ids:
            ability = node_by_id[ability_id]
            append_edge(
                _make_edge(
                    identifier=_stable_id(
                        "migration-edge",
                        "cultivates",
                        experiment["id"],
                        ability_id,
                        contribution["targetId"],
                    ),
                    relation="cultivates",
                    source_node=experiment,
                    target_node=ability,
                    source=deepcopy(contribution["source"]),
                    effective_cycle=contribution["effectiveCycle"],
                    status="draft",
                    review_status="pending",
                )
            )

    node_version_by_id = {
        node["id"]: node["nodeVersionId"] for node in nodes
    }
    edge_version_by_id = {
        edge["id"]: edge["edgeVersionId"] for edge in edges
    }
    return _MigratedPayload(
        nodes=nodes,
        edges=edges,
        node_version_by_id=node_version_by_id,
        edge_ids_by_legacy_id=edge_ids_by_legacy_id,
        edge_version_by_id=edge_version_by_id,
    )


def _migrate_reference(
    raw_reference: dict[str, Any],
    snapshots_by_version: dict[str, _MigratedPayload],
) -> dict[str, Any]:
    graph_version = _bounded(
        raw_reference.get("graphVersion"),
        "legacy-unknown",
        80,
    )
    payload = snapshots_by_version.get(graph_version)
    node_ids = [
        str(identifier)
        for identifier in raw_reference.get("nodeIds", [])
        if str(identifier).strip()
    ]
    legacy_edge_ids = [
        str(identifier)
        for identifier in raw_reference.get("edgeIds", [])
        if str(identifier).strip()
    ]
    if payload is None:
        migrated_edge_ids: list[str] = []
        node_version_ids: list[str] = []
        edge_version_ids: list[str] = []
    else:
        migrated_edge_ids = []
        for legacy_edge_id in legacy_edge_ids:
            for migrated_id in payload.edge_ids_by_legacy_id.get(
                legacy_edge_id,
                [],
            ):
                if migrated_id not in migrated_edge_ids:
                    migrated_edge_ids.append(migrated_id)
        node_version_ids = [
            payload.node_version_by_id[identifier]
            for identifier in node_ids
            if identifier in payload.node_version_by_id
        ]
        edge_version_ids = [
            payload.edge_version_by_id[identifier]
            for identifier in migrated_edge_ids
            if identifier in payload.edge_version_by_id
        ]
    return {
        "id": _bounded(
            raw_reference.get("id"),
            _stable_id("migration-reference", raw_reference),
            160,
        ),
        "module": raw_reference.get("module", "M5"),
        "objectCode": _bounded(
            raw_reference.get("objectCode"),
            "LEGACY-OBJECT",
            120,
        ),
        "label": _bounded(
            raw_reference.get("label"),
            "旧版下游引用",
            240,
        ),
        "graphVersion": graph_version,
        "schemaVersionId": CURRENT_GRAPH_SCHEMA_VERSION_ID,
        "nodeIds": node_ids,
        "nodeVersionIds": node_version_ids,
        "edgeIds": migrated_edge_ids,
        "edgeVersionIds": edge_version_ids,
        "suggestedAction": raw_reference.get(
            "suggestedAction",
            "recheck",
        ),
    }


def migrate_legacy_graph_state(state: GraphState) -> GraphState:
    schema_version_id = str(state.get("schemaVersionId", "")).strip()
    if schema_version_id == CURRENT_GRAPH_SCHEMA_VERSION_ID:
        return state
    if (
        schema_version_id
        and schema_version_id not in LEGACY_GRAPH_SCHEMA_VERSION_IDS
    ):
        raise UnsupportedGraphSchemaVersionError(schema_version_id)

    legacy = deepcopy(state)
    snapshot_payloads: dict[str, _MigratedPayload] = {}
    migrated_snapshots: list[dict[str, Any]] = []
    for raw_snapshot in legacy.get("publishedSnapshots", []):
        if not isinstance(raw_snapshot, dict):
            continue
        version = str(raw_snapshot.get("version", "")).strip()
        published_at = str(raw_snapshot.get("publishedAt", "")).strip()
        if not version or not published_at:
            continue
        try:
            datetime.fromisoformat(published_at.replace("Z", "+00:00"))
        except ValueError:
            continue
        version = version[:80]
        payload = _migrate_payload(
            raw_snapshot.get("nodes", []),
            raw_snapshot.get("edges", []),
        )
        snapshot_payloads[version] = payload
        migrated_snapshots.append(
            {
                "version": version,
                "schemaVersionId": CURRENT_GRAPH_SCHEMA_VERSION_ID,
                "publishedAt": published_at,
                "nodes": payload.nodes,
                "edges": payload.edges,
            }
        )

    current_payload = _migrate_payload(
        legacy.get("nodes", []),
        legacy.get("edges", []),
    )
    references = [
        _migrate_reference(reference, snapshot_payloads)
        for reference in legacy.get("downstreamReferences", [])
        if isinstance(reference, dict)
    ]

    return {
        "schemaVersionId": CURRENT_GRAPH_SCHEMA_VERSION_ID,
        "version": deepcopy(legacy.get("version", {})),
        "nodes": current_payload.nodes,
        "edges": current_payload.edges,
        "publishedSnapshots": migrated_snapshots,
        "downstreamReferences": references,
        "changeReviews": deepcopy(legacy.get("changeReviews", [])),
        "impactDecisions": deepcopy(legacy.get("impactDecisions", [])),
    }


def migrate_legacy_graph_workspace(workspace: GraphWorkspace) -> GraphWorkspace:
    """只构造旧状态的新 Schema 内存视图；此函数不接触仓储，也不写回旧数据。"""
    migrated_state = migrate_legacy_graph_state(workspace.state)
    if migrated_state is workspace.state:
        return workspace
    return GraphWorkspace(
        revision=workspace.revision,
        state=migrated_state,
        updated_at=workspace.updated_at,
        updated_by=workspace.updated_by,
    )
