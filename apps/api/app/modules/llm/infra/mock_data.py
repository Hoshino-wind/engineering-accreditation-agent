"""Mock 数据 — LLM 未配置 API Key 时的降级响应。

与前端 llmClient.ts 的 mock 数据对齐，确保无 API Key 时 Demo 仍可跑。
"""

from __future__ import annotations

from app.modules.llm.domain.models import (
    ExtractionItem,
    RelationItem,
    ReportChapterItem,
    SuggestionItem,
)


def get_mock_extraction_items(
    material_category: str,
    material_name: str,
) -> list[ExtractionItem]:
    """按材料类别返回 mock 提取节点。"""
    if "培养方案" in material_name or "培养方案" in material_category:
        return [
            ExtractionItem(
                code="CO-DS",
                name="数据结构与算法",
                kind="course",
                credit_hours=3.0,
                description="专业核心课，覆盖算法设计与分析能力",
                confidence=0.95,
                source_excerpt="数据结构与算法，3学分，第3学期开设",
            ),
            ExtractionItem(
                code="CO-MCU",
                name="单片机基础",
                kind="course",
                credit_hours=2.0,
                description="工程基础课，嵌入式系统入门",
                confidence=0.93,
                source_excerpt="单片机基础，2学分，第4学期开设",
            ),
            ExtractionItem(
                code="CO-ES",
                name="嵌入式系统原理",
                kind="course",
                credit_hours=1.5,
                description="专业方向课，嵌入式系统设计与应用",
                confidence=0.92,
                source_excerpt="嵌入式系统原理，1.5学分，第5学期开设",
            ),
        ]

    if "实验" in material_name or "实验" in material_category:
        return [
            ExtractionItem(
                code="EXP-LIST",
                name="链表实现实验",
                kind="experiment",
                credit_hours=2.0,
                description="数据结构实验，通过 C 语言实现单链表的各种操作",
                confidence=0.91,
                source_excerpt="实验1：单链表的创建、插入、删除和遍历操作",
            ),
            ExtractionItem(
                code="EXP-SYSTEM",
                name="嵌入式系统设计实验",
                kind="experiment",
                credit_hours=8.0,
                description="嵌入式综合实验，基于 STM32 开发完整系统",
                confidence=0.90,
                source_excerpt="综合实验项目：基于 STM32 的环境监测系统设计",
            ),
            ExtractionItem(
                code="EXP-FPGA-1",
                name="LED流水灯实验",
                kind="experiment",
                credit_hours=2.0,
                description="FPGA 入门实验，用 Verilog 实现流水灯控制",
                confidence=0.89,
                source_excerpt="实验2：LED流水灯，Verilog HDL 实现与板级验证",
            ),
        ]

    if "大纲" in material_name or "课程" in material_category:
        return [
            ExtractionItem(
                code="CO-DS",
                name="数据结构与算法",
                kind="course",
                credit_hours=3.0,
                description="涵盖线性表、树、图、排序、查找等核心算法",
                confidence=0.94,
                source_excerpt="课程目标：掌握常用数据结构及其算法实现",
            ),
            ExtractionItem(
                code="KP-LIST",
                name="链表知识点",
                kind="knowledge",
                description="单链表、双向链表、循环链表的概念与操作",
                confidence=0.90,
                source_excerpt="第2章 线性表：链式存储结构",
            ),
            ExtractionItem(
                code="KP-SORT",
                name="排序算法知识点",
                kind="knowledge",
                description="冒泡排序、快速排序、归并排序的原理与复杂度分析",
                confidence=0.88,
                source_excerpt="第8章 排序：内部排序算法比较",
            ),
        ]

    return [
        ExtractionItem(
            code="RES-DEFAULT",
            name=material_name or "未命名资源",
            kind="resource",
            description="从材料中提取的资源节点",
            confidence=0.85,
            source_excerpt="（默认提取）",
        ),
    ]


def get_mock_relation_items() -> list[RelationItem]:
    """返回 mock 推断关系。"""
    return [
        RelationItem(
            source_id="co-ds",
            target_id="C-01-01",
            relation_type="SUPPORTS",
            strength="strong",
            confidence=0.88,
            reasoning="数据结构与算法课程内容直接覆盖'问题推演与建模'指标要求",
        ),
        RelationItem(
            source_id="exp-list",
            target_id="C-01-02",
            relation_type="SUPPORTS",
            strength="medium",
            confidence=0.82,
            reasoning="链表实现实验间接支撑'问题推演与分析'指标，但实验深度有限",
        ),
        RelationItem(
            source_id="exp-system",
            target_id="C-05-01",
            relation_type="SUPPORTS",
            strength="strong",
            confidence=0.90,
            reasoning="嵌入式系统设计实验要求使用多种开发工具和仪器",
        ),
        RelationItem(
            source_id="exp-fpga-1",
            target_id="C-03-01",
            relation_type="SUPPORTS",
            strength="medium",
            confidence=0.78,
            reasoning="LED流水灯实验涉及电子产品设计的基本流程",
        ),
    ]


def get_mock_suggestion_items(gaps: list[dict]) -> list[SuggestionItem]:
    """根据缺口数据生成 mock 建议。"""
    items = []
    for gap in gaps:
        code = gap.get("code", "")
        name = gap.get("name", "")
        gap_type = gap.get("type", "gap")

        if gap_type == "gap":
            items.append(SuggestionItem(
                target_code=code,
                target_name=name,
                root_cause=f"能力指标 {code}（{name}）当前无任何课程或实验支撑，覆盖强度为 0。",
                suggestion=f"建议在培养方案中新增 1-2 门直接支撑 {name} 的课程，"
                f"或在现有课程中补充相关教学模块和实验环节。",
                expected_effect=f"预计可将 {code} 的覆盖强度从 0 提升至 medium（2分），"
                f"达成度从 0% 提升至 70% 以上。",
            ))
        elif gap_type == "weak":
            items.append(SuggestionItem(
                target_code=code,
                target_name=name,
                root_cause=f"能力指标 {code}（{name}）支撑强度不足，仅有 1 门课程 weak 支撑。",
                suggestion=f"建议为现有支撑课程增加实验课时，或新增综合实验项目"
                f"以强化 {name} 的实践支撑。",
                expected_effect=f"预计可将支撑强度从 weak 提升至 medium，"
                f"达成度提升 15-20%。",
            ))
        else:
            items.append(SuggestionItem(
                target_code=code,
                target_name=name,
                root_cause=f"能力指标 {code}（{name}）存在数据孤岛，部分支撑节点未关联到实验或知识点。",
                suggestion=f"建议完善课程-实验-知识点之间的覆盖关系边。",
                expected_effect="消除数据孤岛，提升图谱连通性和覆盖完整性。",
            ))
    return items


def get_mock_report_items(report_context: list[dict]) -> list[ReportChapterItem]:
    """根据报告上下文生成 mock 章节叙述。"""
    items = []
    for ctx in report_context:
        code = ctx.get("requirement_code", "")
        name = ctx.get("requirement_name", "")
        coverage = ctx.get("coverage_rate", 0)
        attainment = ctx.get("attainment", 0)
        courses = ctx.get("supporting_courses", [])
        improvements = ctx.get("improvements", [])

        courses_text = "、".join(courses) if courses else "暂无支撑课程"
        improvements_text = "；".join(improvements) if improvements else "暂无改进方向"

        narrative = (
            f"本专业在{name}方面的达成情况如下：覆盖率为{coverage:.0%}，"
            f"达成度为{attainment:.0%}。当前支撑课程包括：{courses_text}。"
            f"改进方向：{improvements_text}。"
        )

        items.append(ReportChapterItem(
            requirement_code=code,
            chapter_title=f"{code} {name}",
            standard_ref=name,
            narrative=narrative,
        ))
    return items
