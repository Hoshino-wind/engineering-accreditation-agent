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
    """按材料类别返回 mock 提取节点。

    【粒度规则】
    - kind=course (课程) 和 kind=experiment (实验) 是支撑毕业要求的核心节点
    - kind=knowledge (知识点) 仅是课程/实验的组成部分，不直接支撑毕业要求
    - 禁止将教材章节名（如"链表"、"排序"）作为独立节点
    """
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
        # 从材料名推断课程名：取"实验"前的部分或文件名主体
        import re
        _course_name = "未命名课程"
        # 尝试从文件名提取课程名：如"单片机基础_STM32介绍" → "单片机基础"
        m = re.match(r"^(.+?)[_\-（(]", material_name)
        if m:
            _course_name = m.group(1).strip()
        elif material_name:
            _course_name = material_name.rsplit(".", 1)[0] if "." in material_name else material_name

        return [
            # 课程节点（供 AI 候选课程识别用）
            ExtractionItem(
                code="CO-MOCK",
                name=_course_name,
                kind="course",
                credit_hours=2.0,
                description=f"从材料「{material_name}」中识别的课程",
                confidence=0.88,
                source_excerpt=f"材料名称：{material_name}",
            ),
            # 实验项目节点
            ExtractionItem(
                code="EXP-MCU-01",
                name="单片机GPIO与中断实验",
                kind="experiment",
                credit_hours=1.0,
                description="通过STM32实现GPIO控制和外部中断响应",
                confidence=0.92,
                source_excerpt="实验1：GPIO配置与中断处理",
            ),
            ExtractionItem(
                code="EXP-MCU-02",
                name="单片机定时器与PWM实验",
                kind="experiment",
                credit_hours=1.0,
                description="使用TIM定时器生成PWM波形，实现LED亮度调节",
                confidence=0.91,
                source_excerpt="实验2：定时器捕获与PWM输出",
            ),
            ExtractionItem(
                code="EXP-MCU-03",
                name="单片机串口通信实验",
                kind="experiment",
                credit_hours=1.0,
                description="实现USART串口数据收发，与上位机通信",
                confidence=0.90,
                source_excerpt="实验3：串口通信协议与编程",
            ),
            ExtractionItem(
                code="EXP-SYSTEM-01",
                name="嵌入式综合设计实验",
                kind="experiment",
                credit_hours=2.0,
                description="基于STM32的环境监测系统设计，包含传感器接入、数据采集与上传",
                confidence=0.89,
                source_excerpt="综合实验项目：基于STM32的环境监测系统设计",
            ),
        ]

    if "大纲" in material_name or "课程" in material_category:
        # 【修复】课程大纲提取课程本身和课程总体目标，禁止提取细碎知识点
        return [
            ExtractionItem(
                code="CO-DS",
                name="数据结构与算法",
                kind="course",
                credit_hours=3.0,
                description="专业核心课，涵盖常用数据结构及其算法实现",
                confidence=0.94,
                source_excerpt="数据结构与算法，3学分，第3学期开设",
            ),
            ExtractionItem(
                code="OBJ-DS-01",
                name="掌握数据结构设计与分析能力",
                kind="knowledge",
                description="能够根据实际问题选择合适的数据结构",
                confidence=0.90,
                source_excerpt="课程目标1：掌握常用数据结构及其算法实现",
            ),
            ExtractionItem(
                code="OBJ-DS-02",
                name="具备算法复杂度评估能力",
                kind="knowledge",
                description="能够分析算法的时间复杂度和空间复杂度",
                confidence=0.88,
                source_excerpt="课程目标2：具备算法复杂度分析与评估能力",
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
    """返回 mock 推断关系。

    【修复】只有 course 和 experiment 节点才能作为支撑源，
    knowledge 节点不作为支撑源。
    """
    return [
        # 课程支撑毕业要求
        RelationItem(
            source_id="co-ds",
            target_id="C-01-01",
            relation_type="SUPPORTS",
            strength="strong",
            confidence=0.88,
            reasoning="数据结构与算法核心课程直接覆盖'问题推演与建模'指标要求",
        ),
        RelationItem(
            source_id="co-mcu",
            target_id="C-05-01",
            relation_type="SUPPORTS",
            strength="strong",
            confidence=0.90,
            reasoning="单片机基础课程包含电子产品设计与实现的完整流程",
        ),
        # 实验项目支撑毕业要求
        RelationItem(
            source_id="exp-mcu-01",
            target_id="C-02-01",
            relation_type="SUPPORTS",
            strength="medium",
            confidence=0.82,
            reasoning="单片机GPIO与中断实验训练了工程问题分析与解决能力",
        ),
        RelationItem(
            source_id="exp-system-01",
            target_id="C-04-01",
            relation_type="SUPPORTS",
            strength="strong",
            confidence=0.91,
            reasoning="嵌入式综合设计实验涉及系统级设计、实现与测试全流程",
        ),
        RelationItem(
            source_id="exp-mcu-03",
            target_id="C-03-01",
            relation_type="SUPPORTS",
            strength="medium",
            confidence=0.78,
            reasoning="串口通信实验涉及跨模块接口设计与调试",
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
