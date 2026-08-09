"""种子能力图谱：仅包含不可变的标准库（毕业要求 + 能力指标 + CONTAINS 结构边）。

学校节点（课程 / 实验 / 教学资源）一律不预置，由用户录入课程、
上传教学材料、经 AI 推断和教师审核后逐步建立。

标准库数据来源：《学院汇报-工程认证推动课程建设.pptx》第 13~23 页原文，
2024 版工程教育认证标准。精选电子信息工程最核心的 5 条毕业要求 + 7 个能力指标点。
"""

from app.modules.orchestration.domain.models import (
    AbilityGraph,
    GraphEdge,
    GraphNode,
)


# ── PPT 原文：精选 5 条毕业要求（知识→分析→设计→研究→工具核心链条）──
_GRADUATION_REQUIREMENTS: list[tuple[str, str, str, str]] = [
    ("std-gr-01", "GR-01", "工程知识",
     "能够将数学、自然科学、计算、工程基础和专业知识用于解决复杂工程问题。"),
    ("std-gr-02", "GR-02", "问题分析",
     "能够应用数学、自然科学和工程科学的基本原理，识别、表达并通过文献研究分析复杂工程问题，"
     "综合考虑可持续发展要求，以获得有效结论。"),
    ("std-gr-03", "GR-03", "设计/开发解决方案",
     "能够设计针对复杂工程问题的解决方案，设计满足特定需求的系统、单元或工艺流程，"
     "并能够在设计环节中体现创新思维和考虑健康、安全与环境等因素。"),
    ("std-gr-04", "GR-04", "研究",
     "能够基于科学原理并采用科学方法对复杂工程问题进行研究，"
     "包括设计实验、分析与解释数据、并通过信息综合得到合理有效的结论。"),
    ("std-gr-05", "GR-05", "使用现代工具",
     "能够选择与使用恰当的技术、资源、现代工程工具和信息技术工具，"
     "对复杂工程问题进行预测与模拟，并能够理解其局限性。"),
]


# ── PPT 原文：7 个能力指标点（保留 PPT 原文措辞，含"软件工程领域"）──
_COMPETENCIES: list[tuple[str, str, str, str, str]] = [
    # GR-01 工程知识（1 个）
    ("std-c-01-01", "C-01-01", "1-1 工程知识应用", "GR-01",
     "能够运用数学、自然科学、计算、软件工程专业知识正确表述软件工程领域复杂工程问题，"
     "并理解算力、算法和数据对解决软件工程领域复杂工程问题的意义和基本方法。"),
    # GR-02 问题分析（1 个）
    ("std-c-02-01", "C-02-01", "2-1 问题识别与表达", "GR-02",
     "能够运用数学、自然科学和工程科学的基本原理、基本思维方法正确解析、识别和表达软件工程领域复杂工程问题。"),
    # GR-03 设计/开发解决方案（2 个，核心能力）
    ("std-c-03-01", "C-03-01", "3-1 系统设计方法", "GR-03",
     "掌握针对软件工程领域复杂工程问题的工程设计和产品开发全周期、全流程的设计/开发方法和技术，"
     "了解考虑可能影响设计目标和技术方案的各种因素，能够针对特定需求完成系统、构件或过程的设计，"
     "在设计中体现创新思维和计算思维。"),
    ("std-c-03-02", "C-03-02", "3-2 可行性与影响考量", "GR-03",
     "能够从健康、安全与环境、全生命周期成本与净零碳要求、法律与伦理、社会与文化等角度"
     "考虑解决方案的可行性和实现路径。"),
    # GR-04 研究（2 个，核心能力）
    ("std-c-04-01", "C-04-01", "4-1 实验方案设计", "GR-04",
     "能够基于科学原理，通过文献研究或相关方法对软件工程领域的复杂工程问题的解决方案"
     "进行调研分析、选择研究路线、设计实验或实现方案。"),
    ("std-c-04-02", "C-04-02", "4-2 数据分析与解释", "GR-04",
     "能够根据实验或实现方案构建实验系统、正确采集数据并安全开展实验，"
     "能对实验结果进行分析与解释，并通过信息综合得到合理有效的结论。"),
    # GR-05 使用现代工具（1 个）
    ("std-c-05-01", "C-05-01", "5-1 现代工具选择与使用", "GR-05",
     "能够了解解决软件工程领域复杂工程问题常用的主流技术、工具、模拟软件的使用原理和方法，"
     "并能够选择与使用恰当的技术、工具和专业模拟软件。"),
]


def _standard_nodes() -> list[GraphNode]:
    nodes: list[GraphNode] = []
    # 毕业要求 -> GR code 排序号映射，供能力指标 parent 引用
    gr_sort: dict[str, int] = {}
    for idx, (gid, code, name, desc) in enumerate(_GRADUATION_REQUIREMENTS, start=1):
        gr_sort[code] = idx
        nodes.append(
            GraphNode(
                id=gid,
                kind="GraduationRequirement",
                code=code,
                name=name,
                origin="standard",
                description=desc,
                properties={"sortOrder": idx, "standardVersion": "2024"},
            )
        )
    for cid, code, name, parent_code, desc in _COMPETENCIES:
        nodes.append(
            GraphNode(
                id=cid,
                kind="Competency",
                code=code,
                name=name,
                origin="standard",
                description=desc,
                properties={
                    "parent": parent_code,
                    "level": 2,
                    "standardVersion": "2024",
                },
            )
        )
    return nodes


def _structural_edges() -> list[GraphEdge]:
    edges: list[GraphEdge] = []
    # CONTAINS：毕业要求 → 能力指标（rule / approved，不可变）
    # 通过 parent_code 反查毕业要求 id
    gr_id_by_code: dict[str, str] = {
        code: gid for gid, code, _, _ in _GRADUATION_REQUIREMENTS
    }
    for idx, (_, _, _, parent_code, _) in enumerate(_COMPETENCIES):
        src = gr_id_by_code[parent_code]
        tgt_id = _COMPETENCIES[idx][0]
        edges.append(
            GraphEdge(
                id=f"edge-contains-{idx}",
                source=src,
                target=tgt_id,
                kind="CONTAINS",
                source_type="rule",
                review_status="approved",
            )
        )
    return edges


def build_seed_graph() -> AbilityGraph:
    """构建一份全新的种子图谱（标准库，每次调用返回独立实例）。"""
    return AbilityGraph(nodes=_standard_nodes(), edges=_structural_edges())
