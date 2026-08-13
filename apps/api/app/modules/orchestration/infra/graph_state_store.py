"""能力图谱的单一权威存储：JSON 持久化（必要时可替换为 PostgreSQL 实现）。

背景：LangGraph 使用的 InMemorySaver 不支持后端重启后恢复，且 orchestrator
内部的 `_runs` 字典也是进程内存级的。因此只要后端一重启，用户上传材料
后生长出的能力图谱节点（Course / Experiment / KnowledgePoint /
TeachingResource 及其 SUPPORTS 边）就全部丢失了，对用户体验影响很大。

职责划分（单一真源）：
- 本存储是图谱状态的**唯一权威来源**；orchestrator 启动新运行时从本存储
  读取当前图谱作为初始状态，运行结束后把生长出的图谱合并写回。
- LangGraph 内存 checkpointer 只承担「单次运行内的执行与中断恢复」，
  不再作为读取路径；`get_current_graph` 只读本存储，空则回退种子图。
- 删除逻辑（remove_course）同样以本存储为准：先在持久化图中过滤，
  再尽力同步仍在执行中的运行快照（避免展示层残留孤儿节点）。
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from app.core import json_persistence as jp
from app.modules.courses.domain.course import Course


def _graph_state_file(user_id: str = "template") -> Path:
    jp._ensure_data_dir()
    return jp._DATA_DIR / f"graph_state_{user_id}.json"


@dataclass
class _GraphMutationContext:
    """remove_course 过程中收集到的信息，用于候选清理联动。"""

    removed_node_ids: set[str]


class JsonGraphStateStore:
    """JSON 文件持久化的能力图谱状态，作为图谱的单一权威存储。"""

    def __init__(self, user_id: str = "template") -> None:
        self._user_id = user_id

    # ------------------------------------------------------------------
    # JSON 读写基础
    # ------------------------------------------------------------------
    def _read(self) -> dict[str, list[dict[str, Any]]] | None:
        path = _graph_state_file(self._user_id)
        if not path.exists():
            return None
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
            nodes = raw.get("nodes", [])
            edges = raw.get("edges", [])
            if isinstance(nodes, list) and isinstance(edges, list):
                return {"nodes": nodes, "edges": edges}
        except (json.JSONDecodeError, KeyError, TypeError):
            # 损坏的文件就丢弃，让系统从 seed 重新生长
            return None
        return None

    def _write(self, nodes: list[dict[str, Any]], edges: list[dict[str, Any]]) -> None:
        path = _graph_state_file(self._user_id)
        try:
            path.write_text(
                json.dumps({"nodes": nodes, "edges": edges}, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
        except OSError:
            # 保存失败不影响主流程，内存里的数据还是有效的
            import logging

            logging.getLogger(__name__).warning(
                "[GraphState] 写入持久化文件失败: %s", path, exc_info=True
            )

    # ------------------------------------------------------------------
    # 对外 API：读
    # ------------------------------------------------------------------
    def load(self) -> dict[str, list[dict[str, Any]]] | None:
        """读取持久化图谱；只有当图谱中确实存在（有 school origin 节点）时才返回。"""
        saved = self._read()
        if saved is None:
            return None
        # 至少有一个学校节点（Course/Experiment 等）才算真的有图谱数据，
        # 避免 seed 标准节点被重复叠加（标准节点由 orchestrator 生成即可）
        has_school = any(n.get("origin") == "school" for n in saved["nodes"])
        if not has_school:
            return None
        return saved

    def save(self, nodes: list[dict[str, Any]], edges: list[dict[str, Any]]) -> None:
        """将运行得到的图谱快照同步到 JSON 持久化（合并式写入）。"""
        if not nodes:
            return
        existing = self._read()
        if existing is None:
            self._write(list(nodes), list(edges))
            return
        # 合并策略：以 id 去重，新版覆盖旧版。这样多次运行的结果会累积（新增更多课程节点）
        node_by_id: dict[str, dict[str, Any]] = {n["id"]: n for n in existing["nodes"]}
        edge_by_id: dict[str, dict[str, Any]] = {e["id"]: e for e in existing["edges"]}
        for n in nodes:
            nid = n.get("id")
            if nid:
                node_by_id[nid] = n
        for e in edges:
            eid = e.get("id")
            if eid:
                edge_by_id[eid] = e
        self._write(list(node_by_id.values()), list(edge_by_id.values()))

    # ------------------------------------------------------------------
    # 对外 API：删除课程
    # ------------------------------------------------------------------
    def remove_course(self, course: Course) -> _GraphMutationContext:
        """从持久化图谱中移除指定课程（包含变体命名）及其下游子节点与关联边。

        返回的上下文中携带被移除节点的 id 集合，便于调用方联动清理 candidates
        等其他仓储中的关联数据。
        """
        saved = self._read()
        if saved is None:
            return _GraphMutationContext(removed_node_ids=set())

        nodes = saved["nodes"]
        edges = saved["edges"]

        course_code = (course.code or "").strip().lower()
        course_name = (course.name or "").strip()
        course_name_norm = course_name.lower()
        graph_node_id = course.graph_node_id

        # Pass 1: 找出 Course 匹配节点
        course_node_ids: set[str] = set()
        for node in nodes:
            if node.get("kind") != "Course":
                continue
            if graph_node_id and node.get("id") == graph_node_id:
                course_node_ids.add(node["id"])
                continue
            if course_code and (node.get("code") or "").strip().lower() == course_code:
                course_node_ids.add(node["id"])
                continue
            if course_name:
                name = (node.get("name") or "").strip()
                if name == course_name:
                    course_node_ids.add(node["id"])
                    continue
                if name and course_name_norm and course_name_norm in name.lower():
                    course_node_ids.add(node["id"])
                    continue

        if not course_node_ids:
            return _GraphMutationContext(removed_node_ids=set())

        # Pass 2: 下游子节点（Course -> 直连的 Experiment/KP/TeachingResource）
        to_remove: set[str] = set(course_node_ids)
        for edge in edges:
            if edge.get("source") in course_node_ids:
                target_kind = next(
                    (n.get("kind") for n in nodes if n.get("id") == edge.get("target")),
                    None,
                )
                if target_kind in (
                    "Experiment",
                    "KnowledgePoint",
                    "TeachingResource",
                ):
                    to_remove.add(str(edge["target"]))

        new_nodes = [n for n in nodes if n.get("id") not in to_remove]
        new_edges = [
            e
            for e in edges
            if e.get("source") not in to_remove and e.get("target") not in to_remove
        ]
        self._write(new_nodes, new_edges)
        return _GraphMutationContext(removed_node_ids=to_remove)

    def remove_material(
        self,
        *,
        material_names: set[str],
        resource_ids: set[str],
    ) -> _GraphMutationContext:
        """移除由指定材料提取出的学校节点与关联边。

        节点提取阶段会在 school 节点 properties.materialName 中记录材料名。
        删除 M3 材料时，图谱必须同步撤销这些节点，否则会出现"材料清单为空，
        但图谱仍然显示旧实验/支撑关系"的状态。
        """
        normalized = {
            name.strip().lower()
            for name in material_names
            if name and name.strip()
        }
        normalized_ids = {
            value.strip()
            for value in resource_ids
            if value and value.strip()
        }
        if not normalized and not normalized_ids:
            return _GraphMutationContext(removed_node_ids=set())

        saved = self._read()
        if saved is None:
            return _GraphMutationContext(removed_node_ids=set())

        nodes = saved["nodes"]
        edges = saved["edges"]

        def _legacy_name_matches(props: dict[str, Any]) -> bool:
            values = [
                props.get("materialName"),
                props.get("materialFileName"),
                props.get("resourceName"),
            ]
            return any(str(value or "").strip().lower() in normalized for value in values)

        to_remove: set[str] = set()
        new_nodes: list[dict[str, Any]] = []
        for node in nodes:
            if node.get("origin") != "school" or not node.get("id"):
                new_nodes.append(node)
                continue
            props = dict(node.get("properties") or {})
            refs = [
                dict(ref)
                for ref in props.get("materialRefs", [])
                if isinstance(ref, dict)
            ]
            matched_refs = [
                ref
                for ref in refs
                if str(ref.get("resourceId") or "").strip() in normalized_ids
            ]
            if matched_refs:
                remaining_refs = [ref for ref in refs if ref not in matched_refs]
                if remaining_refs:
                    active = remaining_refs[-1]
                    props.update(
                        {
                            "materialRefs": remaining_refs,
                            "materialId": active.get("resourceId", ""),
                            "materialVersionGroupId": active.get("versionGroupId", ""),
                            "materialVersion": active.get("version", ""),
                            "materialName": active.get("name", ""),
                            "materialFileName": active.get("fileName", ""),
                        }
                    )
                    new_nodes.append({**node, "properties": props})
                else:
                    to_remove.add(str(node["id"]))
                continue

            has_stable_identity = bool(
                refs or str(props.get("materialId") or "").strip()
            )
            direct_match = str(props.get("materialId") or "").strip() in normalized_ids
            legacy_match = not has_stable_identity and _legacy_name_matches(props)
            if direct_match or legacy_match:
                to_remove.add(str(node["id"]))
            else:
                new_nodes.append(node)

        if not to_remove:
            # 即使没有节点被删，也可能有只属于该材料的关系需要撤销。
            pass

        new_edges = []
        for edge in edges:
            if edge.get("source") in to_remove or edge.get("target") in to_remove:
                continue
            refs = [
                dict(ref)
                for ref in edge.get("materialRefs", [])
                if isinstance(ref, dict)
            ]
            remaining_refs = [
                ref
                for ref in refs
                if str(ref.get("resourceId") or "").strip() not in normalized_ids
            ]
            if refs and not remaining_refs:
                continue
            edge_resource_id = str(edge.get("materialResourceId") or "").strip()
            if not refs and edge_resource_id and edge_resource_id in normalized_ids:
                continue
            new_edges.append(
                {**edge, "materialRefs": remaining_refs} if refs else edge
            )
        self._write(new_nodes, new_edges)
        return _GraphMutationContext(removed_node_ids=to_remove)

    def remove_material_names(self, material_names: set[str]) -> _GraphMutationContext:
        """兼容旧调用：旧图谱没有 resource id 时按材料名清理。"""
        return self.remove_material(material_names=material_names, resource_ids=set())

    def retain_materials(self, valid_resource_ids: set[str]) -> _GraphMutationContext:
        """让学校侧图谱只保留仍存在于材料仓储中的引用。

        PostgreSQL 是材料真源，图谱 JSON 可能包含迁移前留下的材料 ID。删除材料后
        用当前专业仍存在的材料 ID 调用本方法，可移除孤立节点和关系；共享节点只会
        删除失效引用，只要仍有一份有效材料支撑就会保留。
        """
        valid_ids = {
            value.strip()
            for value in valid_resource_ids
            if value and value.strip()
        }
        saved = self._read()
        if saved is None:
            return _GraphMutationContext(removed_node_ids=set())

        nodes = saved["nodes"]
        edges = saved["edges"]
        to_remove: set[str] = set()
        new_nodes: list[dict[str, Any]] = []

        for node in nodes:
            node_id = str(node.get("id") or "")
            if node.get("origin") != "school" or not node_id:
                new_nodes.append(node)
                continue

            # 没有任何材料时，学校侧图谱不应继续存在。该规则同时负责清理
            # 早期版本中没有稳定 materialId 的遗留节点。
            if not valid_ids:
                to_remove.add(node_id)
                continue

            raw_props = node.get("properties") or {}
            props = dict(raw_props) if isinstance(raw_props, dict) else {}
            refs = [
                dict(ref)
                for ref in props.get("materialRefs", [])
                if isinstance(ref, dict)
            ]
            if refs:
                active_refs = [
                    ref
                    for ref in refs
                    if str(ref.get("resourceId") or "").strip() in valid_ids
                ]
                if not active_refs:
                    to_remove.add(node_id)
                    continue
                active = active_refs[-1]
                props.update(
                    {
                        "materialRefs": active_refs,
                        "materialId": active.get("resourceId", ""),
                        "materialVersionGroupId": active.get("versionGroupId", ""),
                        "materialVersion": active.get("version", ""),
                        "materialName": active.get("name", ""),
                        "materialFileName": active.get("fileName", ""),
                    }
                )
                new_nodes.append({**node, "properties": props})
                continue

            material_id = str(props.get("materialId") or "").strip()
            if material_id and material_id not in valid_ids:
                to_remove.add(node_id)
                continue

            # 部分旧图谱没有稳定材料身份。仍有有效材料时无法可靠判断归属，
            # 因而保留；待这些节点被重新解析后会自动获得 materialRefs。
            new_nodes.append(node)

        new_edges: list[dict[str, Any]] = []
        for edge in edges:
            if edge.get("source") in to_remove or edge.get("target") in to_remove:
                continue

            refs = [
                dict(ref)
                for ref in edge.get("materialRefs", [])
                if isinstance(ref, dict)
            ]
            if refs:
                active_refs = [
                    ref
                    for ref in refs
                    if str(ref.get("resourceId") or "").strip() in valid_ids
                ]
                if not active_refs:
                    continue
                new_edges.append({**edge, "materialRefs": active_refs})
                continue

            material_id = str(edge.get("materialResourceId") or "").strip()
            if material_id and material_id not in valid_ids:
                continue
            new_edges.append(edge)

        self._write(new_nodes, new_edges)
        return _GraphMutationContext(removed_node_ids=to_remove)

    def clear_school_nodes(self, course_name: str | None = None) -> _GraphMutationContext:
        """清空当前图谱中的学校侧节点。

        用于 M3 的"清空当前范围"操作：用户可能已经把本地材料文件删掉，
        但图谱持久化里仍保留旧课程、实验项目和支撑关系。该操作会保留
        标准库节点和 CONTAINS 结构边，只撤销由材料/课程产生的学校侧数据。
        传入 course_name 时优先只清该课程；不传则清当前专业下全部学校节点。
        """
        saved = self._read()
        if saved is None:
            return _GraphMutationContext(removed_node_ids=set())

        nodes = saved["nodes"]
        edges = saved["edges"]
        target_course = (course_name or "").strip().lower()

        def _norm(value: Any) -> str:
            return str(value or "").strip().lower()

        def _props(node: dict[str, Any]) -> dict[str, Any]:
            props = node.get("properties") or {}
            return props if isinstance(props, dict) else {}

        def _matches_course(node: dict[str, Any]) -> bool:
            if node.get("origin") != "school":
                return False
            if not target_course:
                return True
            props = _props(node)
            values = [
                node.get("name"),
                node.get("code"),
                props.get("course"),
                props.get("courseName"),
                props.get("course_name"),
                props.get("materialCourse"),
            ]
            return any(
                value_norm == target_course or target_course in value_norm
                for value_norm in (_norm(value) for value in values)
                if value_norm
            )

        school_ids = {
            str(node["id"])
            for node in nodes
            if node.get("id") and node.get("origin") == "school"
        }
        to_remove = {
            str(node["id"])
            for node in nodes
            if node.get("id") and _matches_course(node)
        }

        # 若命中课程节点，则把课程下游的实验/知识点/教学资源一起清理。
        changed = True
        while changed:
            changed = False
            for edge in edges:
                source = str(edge.get("source") or "")
                target = str(edge.get("target") or "")
                if source in to_remove and target in school_ids and target not in to_remove:
                    to_remove.add(target)
                    changed = True

        if not to_remove:
            return _GraphMutationContext(removed_node_ids=set())

        new_nodes = [n for n in nodes if n.get("id") not in to_remove]
        new_edges = [
            e
            for e in edges
            if e.get("source") not in to_remove and e.get("target") not in to_remove
        ]
        self._write(new_nodes, new_edges)
        return _GraphMutationContext(removed_node_ids=to_remove)
