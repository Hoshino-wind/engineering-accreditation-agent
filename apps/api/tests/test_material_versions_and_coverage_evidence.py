from __future__ import annotations

import asyncio

from app.modules.orchestration.domain.coverage import analyze_coverage
from app.modules.orchestration.domain.models import AbilityGraph, GraphEdge, GraphNode
from app.modules.orchestration.infra.graph_state_store import JsonGraphStateStore
from app.modules.orchestration.infra.tools import without_superseded_material_version
from app.modules.resources.application.upload_resource import UploadResource
from app.modules.resources.infra.memory_store import InMemoryResourceRepository


def test_uploading_same_file_creates_version_chain(monkeypatch, tmp_path) -> None:
    import app.core.json_persistence as jp

    monkeypatch.setattr(jp, "_DATA_DIR", tmp_path)
    repository = InMemoryResourceRepository(with_seed=False, user_id="versions")
    upload = UploadResource(repository=repository, owner="teacher", major_id="major-eie")

    first = asyncio.run(
        upload.execute(
            file_name="embedded-lab-guide.pdf",
            file_size_bytes=100,
            course="Embedded Systems",
            category="实验指导书",
            content_hash="hash-v1",
        )
    )
    second = asyncio.run(
        upload.execute(
            file_name="embedded-lab-guide.pdf",
            file_size_bytes=120,
            course="Embedded Systems",
            category="实验指导书",
            content_hash="hash-v2",
        )
    )

    stored_first = asyncio.run(repository.get_by_id(first.id))
    assert stored_first is not None
    assert first.version == "v1"
    assert second.version == "v2"
    assert second.version_group_id == first.id
    assert second.supersedes_id == first.id
    assert stored_first.is_current_version is False
    assert second.is_current_version is True


def test_remove_material_keeps_node_shared_by_another_resource(monkeypatch, tmp_path) -> None:
    import app.core.json_persistence as jp

    monkeypatch.setattr(jp, "_DATA_DIR", tmp_path)
    store = JsonGraphStateStore(user_id="shared-material")
    shared_node = {
        "id": "ext-exp-1",
        "kind": "Experiment",
        "code": "EXP-1",
        "name": "Shared experiment",
        "origin": "school",
        "properties": {
            "materialId": "resource-v2",
            "materialVersion": "v2",
            "materialRefs": [
                {"resourceId": "resource-v1", "version": "v1", "name": "guide.pdf"},
                {"resourceId": "resource-v2", "version": "v2", "name": "guide.pdf"},
            ],
        },
    }
    store.save([shared_node], [])

    result = store.remove_material(
        material_names={"guide.pdf"},
        resource_ids={"resource-v1"},
    )

    assert result.removed_node_ids == set()
    remaining = store.load()
    assert remaining is not None
    refs = remaining["nodes"][0]["properties"]["materialRefs"]
    assert [ref["resourceId"] for ref in refs] == ["resource-v2"]


def test_retain_materials_removes_stale_refs_but_keeps_shared_node(
    monkeypatch, tmp_path
) -> None:
    import app.core.json_persistence as jp

    monkeypatch.setattr(jp, "_DATA_DIR", tmp_path)
    store = JsonGraphStateStore(user_id="retain-shared")
    stale_ref = {"resourceId": "resource-old", "version": "v1"}
    valid_ref = {"resourceId": "resource-current", "version": "v1"}
    nodes = [
        {
            "id": "std-c-1",
            "kind": "Competency",
            "origin": "standard",
            "properties": {},
        },
        {
            "id": "shared-exp",
            "kind": "Experiment",
            "origin": "school",
            "properties": {
                "materialId": "resource-old",
                "materialRefs": [stale_ref, valid_ref],
            },
        },
    ]
    edges = [
        {
            "id": "contains",
            "source": "std-gr-1",
            "target": "std-c-1",
            "kind": "CONTAINS",
        },
        {
            "id": "supports",
            "source": "shared-exp",
            "target": "std-c-1",
            "kind": "SUPPORTS",
            "materialRefs": [stale_ref, valid_ref],
        },
    ]
    store.save(nodes, edges)

    result = store.retain_materials({"resource-current"})

    assert result.removed_node_ids == set()
    saved = store._read()
    assert saved is not None
    shared = next(node for node in saved["nodes"] if node["id"] == "shared-exp")
    assert shared["properties"]["materialId"] == "resource-current"
    assert shared["properties"]["materialRefs"] == [valid_ref]
    support = next(edge for edge in saved["edges"] if edge["id"] == "supports")
    assert support["materialRefs"] == [valid_ref]


def test_retain_materials_with_empty_repository_clears_school_graph(
    monkeypatch, tmp_path
) -> None:
    import app.core.json_persistence as jp

    monkeypatch.setattr(jp, "_DATA_DIR", tmp_path)
    store = JsonGraphStateStore(user_id="retain-empty")
    nodes = [
        {
            "id": "std-c-1",
            "kind": "Competency",
            "origin": "standard",
            "properties": {},
        },
        {
            "id": "legacy-course",
            "kind": "Course",
            "origin": "school",
            "properties": {},
        },
        {
            "id": "stale-exp",
            "kind": "Experiment",
            "origin": "school",
            "properties": {"materialId": "resource-missing"},
        },
    ]
    edges = [
        {
            "id": "contains",
            "source": "std-gr-1",
            "target": "std-c-1",
            "kind": "CONTAINS",
        },
        {
            "id": "supports",
            "source": "stale-exp",
            "target": "std-c-1",
            "kind": "SUPPORTS",
            "materialResourceId": "resource-missing",
        },
    ]
    store.save(nodes, edges)

    result = store.retain_materials(set())

    assert result.removed_node_ids == {"legacy-course", "stale-exp"}
    saved = store._read()
    assert saved is not None
    assert [node["id"] for node in saved["nodes"]] == ["std-c-1"]
    assert [edge["id"] for edge in saved["edges"]] == ["contains"]


def test_coverage_explains_counted_material_version() -> None:
    requirement = GraphNode(
        id="gr-1", kind="GraduationRequirement", code="GR-01", name="Knowledge", origin="standard"
    )
    competency = GraphNode(
        id="c-1", kind="Competency", code="C-01-01", name="Apply knowledge", origin="standard"
    )
    experiment = GraphNode(
        id="exp-1",
        kind="Experiment",
        code="EXP-1",
        name="Design experiment",
        origin="school",
        properties={
            "materialId": "resource-2",
            "materialVersion": "v2",
            "materialFileName": "embedded-lab-guide.pdf",
        },
    )
    graph = AbilityGraph(
        nodes=[requirement, competency, experiment],
        edges=[
            GraphEdge(
                id="contains", source="gr-1", target="c-1", kind="CONTAINS",
                source_type="rule", review_status="approved",
            ),
            GraphEdge(
                id="support", source="exp-1", target="c-1", kind="SUPPORTS",
                review_status="approved", strength="strong", confidence=0.91,
                reasoning="Teacher approved the extracted evidence.",
                material_resource_id="resource-2", material_version="v2",
                material_name="embedded-lab-guide.pdf",
            ),
        ],
    )

    report = analyze_coverage(graph).to_dict()
    item = report["competencies"][0]
    assert item["status"] == "partial"
    assert item["evidenceSourceCount"] == 1
    assert item["evidence"] == [
        {
            "edgeId": "support",
            "sourceNodeId": "exp-1",
            "sourceCode": "EXP-1",
            "sourceName": "Design experiment",
            "strength": "strong",
            "weight": 3,
            "confidence": 0.91,
            "reviewStatus": "approved",
            "reasoning": "Teacher approved the extracted evidence.",
            "materialId": "resource-2",
            "materialVersionGroupId": None,
            "materialVersion": "v2",
            "materialName": "embedded-lab-guide.pdf",
            "counted": True,
            "countReason": "教师已审核通过，计入材料支撑强度；充分性还需满足多材料证据门槛。",
        }
    ]


def test_new_version_replaces_old_graph_snapshot_without_resurrection() -> None:
    old_ref = {
        "resourceId": "resource-v1",
        "versionGroupId": "group-1",
        "version": "v1",
        "name": "guide",
        "fileName": "guide.pdf",
    }
    nodes = [
        {
            "id": "old-only",
            "kind": "Experiment",
            "code": "OLD",
            "name": "Old experiment",
            "origin": "school",
            "properties": {
                "materialId": "resource-v1",
                "materialVersionGroupId": "group-1",
                "materialRefs": [old_ref],
            },
        }
    ]
    edges = [
        {
            "id": "old-support",
            "source": "old-only",
            "target": "std-c-01-01",
            "kind": "SUPPORTS",
            "reviewStatus": "approved",
            "materialResourceId": "resource-v1",
            "materialVersionGroupId": "group-1",
        }
    ]

    next_nodes, next_edges = without_superseded_material_version(
        nodes,
        edges,
        version_group_id="group-1",
        current_resource_id="resource-v2",
        material_names={"guide", "guide.pdf"},
    )

    assert next_nodes == []
    assert next_edges == []
