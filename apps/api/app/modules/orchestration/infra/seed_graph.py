"""种子能力图谱：电子信息工程（嵌入式）方向的标准库 + 学校教学节点。

标准库（毕业要求 / 能力指标）为不可变的「尺子」；学校节点为已治理好的课程与实验。
关系推理智能体在此基础上推断 experiment→competency 的 SUPPORTS 关系（pending），
经教师审核网关批准后，才参与覆盖度计算。
"""

from app.modules.orchestration.domain.models import (
    AbilityGraph,
    GraphEdge,
    GraphNode,
)


def _standard_nodes() -> list[GraphNode]:
    graduation_requirements = [
        ("std-gr-01", "GR-01", "工程知识"),
        ("std-gr-03", "GR-03", "设计/开发解决方案"),
        ("std-gr-04", "GR-04", "研究"),
        ("std-gr-05", "GR-05", "使用现代工具"),
    ]
    competencies = [
        ("std-c-01-01", "C-01-01", "工程知识应用", "std-gr-01"),
        ("std-c-01-02", "C-01-02", "问题推演与分析", "std-gr-01"),
        ("std-c-03-01", "C-03-01", "系统设计方法", "std-gr-03"),
        ("std-c-04-02", "C-04-02", "数据分析与解释", "std-gr-04"),
        ("std-c-05-01", "C-05-01", "现代工具选择与使用", "std-gr-05"),
    ]
    nodes: list[GraphNode] = []
    for gid, code, name in graduation_requirements:
        nodes.append(
            GraphNode(
                id=gid,
                kind="GraduationRequirement",
                code=code,
                name=name,
                origin="standard",
                properties={"standardVersion": "2024"},
            )
        )
    for cid, code, name, parent in competencies:
        nodes.append(
            GraphNode(
                id=cid,
                kind="Competency",
                code=code,
                name=name,
                origin="standard",
                properties={"parent": parent, "standardVersion": "2024"},
            )
        )
    return nodes


def _school_nodes() -> list[GraphNode]:
    courses = [
        ("co-ds", "CS-2001", "数据结构与算法", "线性表、树、图、排序与查找算法"),
        ("co-mcu", "B020012005", "单片机基础", "基于 STM32 的嵌入式系统开发"),
        ("co-fpga", "B020031006", "嵌入式系统原理", "基于 Verilog HDL 与 FPGA 的数字系统设计"),
    ]
    experiments = [
        ("exp-list", "EXP-DS-01", "链表实现", "使用 C/C++ 实现单链表、双链表、循环链表"),
        ("exp-sort", "EXP-DS-02", "排序对比", "对比冒泡、快速、归并排序的性能"),
        ("exp-system", "EXP-EMB-01", "系统设计", "基于 STM32 的综合嵌入式系统设计"),
        ("exp-fpga-1", "EXP-FPGA-01", "LED流水灯", "基于 Verilog 的 FPGA 入门实验"),
    ]
    nodes: list[GraphNode] = []
    for cid, code, name, desc in courses:
        nodes.append(
            GraphNode(id=cid, kind="Course", code=code, name=name, origin="school", description=desc)
        )
    for eid, code, name, desc in experiments:
        nodes.append(
            GraphNode(id=eid, kind="Experiment", code=code, name=name, origin="school", description=desc)
        )
    return nodes


def _structural_edges() -> list[GraphEdge]:
    edges: list[GraphEdge] = []

    # CONTAINS：毕业要求 → 能力指标（rule / approved）
    contains = [
        ("std-gr-01", "std-c-01-01"),
        ("std-gr-01", "std-c-01-02"),
        ("std-gr-03", "std-c-03-01"),
        ("std-gr-04", "std-c-04-02"),
        ("std-gr-05", "std-c-05-01"),
    ]
    for i, (src, tgt) in enumerate(contains):
        edges.append(
            GraphEdge(
                id=f"edge-contains-{i}",
                source=src,
                target=tgt,
                kind="CONTAINS",
                source_type="rule",
                review_status="approved",
            )
        )

    # SUPPORTS_REQ：课程 → 毕业要求（rule / approved）
    supports_req = [
        ("co-ds", "std-gr-01", "strong"),
        ("co-ds", "std-gr-04", "medium"),
        ("co-fpga", "std-gr-03", "strong"),
        ("co-mcu", "std-gr-05", "strong"),
    ]
    for i, (src, tgt, strength) in enumerate(supports_req):
        edges.append(
            GraphEdge(
                id=f"edge-supports-req-{i}",
                source=src,
                target=tgt,
                kind="SUPPORTS_REQ",
                source_type="rule",
                review_status="approved",
                strength=strength,  # type: ignore[arg-type]
            )
        )

    # BELONGS_TO：实验 → 课程（manual / approved）
    belongs_to = [
        ("exp-list", "co-ds"),
        ("exp-sort", "co-ds"),
        ("exp-system", "co-mcu"),
        ("exp-fpga-1", "co-fpga"),
    ]
    for i, (src, tgt) in enumerate(belongs_to):
        edges.append(
            GraphEdge(
                id=f"edge-belongs-{i}",
                source=src,
                target=tgt,
                kind="BELONGS_TO",
                source_type="manual",
                review_status="approved",
            )
        )

    return edges


def build_seed_graph() -> AbilityGraph:
    """构建一份全新的种子图谱（每次调用返回独立实例，避免跨运行串扰）。"""
    return AbilityGraph(nodes=_standard_nodes() + _school_nodes(), edges=_structural_edges())
