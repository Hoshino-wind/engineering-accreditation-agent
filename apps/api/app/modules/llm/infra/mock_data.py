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


STAGED_DEMO_TARGETS = [
    (
        "C-01-01",
        "EXP-DEMO-C01-01",
        "GPIO 与定时器基础验证实验",
        "通过 GPIO 控制、定时器中断和基础调试说明工程基础知识的应用，支撑 C-01-01 工程知识应用。",
    ),
    (
        "C-02-01",
        "EXP-DEMO-C02-01",
        "串口通信故障定位实验",
        "通过协议抓包、串口波形观察和故障复现训练问题识别与表达，支撑 C-02-01 问题识别与表达。",
    ),
    (
        "C-03-01",
        "EXP-DEMO-C03-01",
        "RTOS 任务调度系统设计实验",
        "通过任务划分、优先级设置和同步机制完成系统设计方法训练，支撑 C-03-01 系统设计方法。",
    ),
    (
        "C-03-02",
        "EXP-DEMO-C03-02",
        "嵌入式方案可行性与影响分析任务",
        "要求学生比较功耗、成本、可靠性、安全与环境影响，支撑 C-03-02 可行性与影响考量。",
    ),
    (
        "C-04-01",
        "EXP-DEMO-C04-01",
        "研究型实验方案设计",
        "要求学生提出实验假设、变量控制、实验路线和验证方案，支撑 C-04-01 实验方案设计。",
    ),
    (
        "C-04-02",
        "EXP-DEMO-C04-02",
        "实验数据采集、分析与解释任务",
        "要求学生采集传感器数据，完成统计分析、误差解释和结论复核，支撑 C-04-02 数据分析与解释。",
    ),
    (
        "C-05-01",
        "EXP-DEMO-C05-01",
        "调试工具链与仿真验证实验",
        "通过 Keil、串口调试助手、逻辑分析仪和仿真器完成工具链训练，支撑 C-05-01 现代工具选择与使用。",
    ),
]


def _get_staged_demo_extraction_items(content: str) -> list[ExtractionItem]:
    """为 staged demo 材料提供可复现的兜底提取结果。"""
    if "staged_coverage_demo" not in content and "阶段覆盖演示" not in content:
        return []

    items = [
        ExtractionItem(
            code="CO-ES",
            name="嵌入式系统原理",
            kind="course",
            credit_hours=2.0,
            description="围绕嵌入式系统设计、实验验证、数据分析和工程影响评价组织教学。",
            confidence=0.96,
            source_excerpt="DEMO_TAG: STAGED_COVERAGE_DEMO；课程名称：嵌入式系统原理",
        )
    ]
    for target_code, exp_code, name, description in STAGED_DEMO_TARGETS:
        compact_code = target_code.lower().replace("-", "")
        if target_code.lower() not in content and compact_code not in content:
            continue
        items.append(
            ExtractionItem(
                code=exp_code,
                name=name,
                kind="experiment",
                credit_hours=1.0,
                description=description,
                confidence=0.95,
                source_excerpt=f"对应指标：{target_code}；支撑强度：strong；演示材料可追溯。",
            )
        )
    return items if len(items) > 1 else []


def get_mock_extraction_items(
    material_category: str,
    material_name: str,
    material_text: str = "",
) -> list[ExtractionItem]:
    """按材料类别返回 mock 提取节点。

    【粒度规则】
    - kind=course (课程) 和 kind=experiment (实验) 是支撑毕业要求的核心节点
    - kind=knowledge (知识点) 仅是课程/实验的组成部分，不直接支撑毕业要求
    - 禁止将教材章节名（如"链表"、"排序"）作为独立节点
    """
    content = f"{material_name}\n{material_category}\n{material_text}".lower()
    staged_demo_items = _get_staged_demo_extraction_items(content)
    if staged_demo_items:
        return staged_demo_items

    if (
        "机械设计制造及其自动化" in content
        or "机械制造工艺基础" in content
        or "数控车削" in content
    ):
        return [
            ExtractionItem(
                code="CO-ME-201",
                name="机械制造工艺基础",
                kind="course",
                credit_hours=3.0,
                description="围绕机械零件加工工艺设计、数控加工、CAD/CAE 工具应用和误差分析组织教学。",
                confidence=0.96,
                source_excerpt="课程名称：机械制造工艺基础；所属专业：机械设计制造及其自动化",
            ),
            ExtractionItem(
                code="EXP-ME-C01-01",
                name="轴类零件加工工艺设计与工序卡编制",
                kind="experiment",
                credit_hours=1.0,
                description="学生根据零件图纸、材料、精度等级和加工约束完成工艺路线设计，明确支撑 C-01-01 工程知识应用。",
                confidence=0.95,
                source_excerpt="对应指标：C-01-01；支撑强度：strong；证据来源：实验报告、工序卡、教师评分表。",
            ),
            ExtractionItem(
                code="EXP-ME-C03-01",
                name="数控车削加工参数优化与质量验证",
                kind="experiment",
                credit_hours=1.0,
                description="学生围绕表面粗糙度、加工效率和刀具磨损约束设计加工方案，明确支撑 C-03-01 系统设计方法。",
                confidence=0.94,
                source_excerpt="对应指标：C-03-01；支撑强度：strong；证据来源：加工方案、仿真记录、实物测量记录。",
            ),
            ExtractionItem(
                code="EXP-ME-C05-01",
                name="CAD/CAE 建模与夹具方案验证",
                kind="experiment",
                credit_hours=1.0,
                description="学生使用 CAD/CAE 工具完成建模、夹具定位与干涉检查，明确支撑 C-05-01 现代工具选择与使用。",
                confidence=0.94,
                source_excerpt="对应指标：C-05-01；支撑强度：strong；证据来源：三维模型、仿真截图、工程图。",
            ),
            ExtractionItem(
                code="EXP-ME-C04-02",
                name="尺寸测量、误差分析与工艺改进",
                kind="experiment",
                credit_hours=1.0,
                description="学生采集关键尺寸数据、分析误差来源并提出工艺调整建议，明确支撑 C-04-02 数据分析与解释。",
                confidence=0.94,
                source_excerpt="对应指标：C-04-02；支撑强度：strong；证据来源：测量数据表、误差分析报告、改进建议。",
            ),
        ]

    if (
        "c-04-01" in content
        or "c04-01" in content
        or "实验方案设计" in content
        or ("gr-04" in content and "研究" in content and "实验" in content)
    ):
        return [
            ExtractionItem(
                code="CO-ES",
                name="嵌入式系统原理",
                kind="course",
                credit_hours=2.0,
                description="围绕嵌入式系统方案设计、实验验证与数据分析组织教学。",
                confidence=0.95,
                source_excerpt="课程名称：嵌入式系统原理",
            ),
            ExtractionItem(
                code="EXP-C04-01",
                name="研究型实验：嵌入式环境监测节点的低功耗采集方案设计",
                kind="experiment",
                credit_hours=2.0,
                description=(
                    "要求学生完成文献调研、研究路线比较、实验目的设定、硬件与软件方案设计、"
                    "数据采集方法设计和误差控制，直接支撑 C-04-01 4-1 实验方案设计。"
                ),
                confidence=0.96,
                source_excerpt="对应指标：C-04-01 4-1 实验方案设计；评分项 R2：实验方案完整性；支撑强度：强支撑。",
            ),
        ]

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


def get_mock_relation_items(
    school_nodes: list[dict],
    standard_nodes: list[dict],
) -> list[RelationItem]:
    """基于当前图谱节点动态生成 mock 支撑关系（模拟 LLM 的推断行为）。

    【与真实 LLM 对齐】仅 kind=course / kind=experiment 的学校节点能作为
    支撑源（source_id），地址用节点真实 id；目标从标准 Competency 取 code。
    这样无论提取出哪些节点，关系都与图谱始终自洽，不会产生悬空端点。
    节点不足时返回空列表（与真实 LLM 输出一致，不会硬凑关系）。
    """
    sources = [
        n for n in school_nodes if str(n.get("kind", "")).lower() in ("course", "experiment")
    ]
    if any(str(n.get("kind", "")).lower() == "experiment" for n in sources):
        # 实验指导书中课程节点只是归属上下文；真正参与审核的是实验项目。
        # 否则同一材料会同时产生“课程→指标”和“实验→指标”两批候选。
        sources = [n for n in sources if str(n.get("kind", "")).lower() == "experiment"]
    target_codes = [
        n.get("code", "") for n in standard_nodes
        if str(n.get("kind", "")).lower() == "competency"
    ]
    if not school_nodes or not sources:
        return []

    # 标准指标缺失时回退到种子毕业要求指标——模拟 LLM 对认证标准的先验知识
    if not target_codes:
        target_codes = [
            "C-01-01", "C-05-01", "C-02-01", "C-04-01", "C-03-01",
            "C-03-02", "C-04-02",
        ]

    items: list[RelationItem] = []
    for i, node in enumerate(sources):
        node_text = " ".join(
            str(part or "")
            for part in (
                node.get("id"),
                node.get("code"),
                node.get("name"),
                node.get("description"),
                (node.get("properties") or {}).get("sourceExcerpt")
                if isinstance(node.get("properties"), dict)
                else "",
            )
        ).lower()
        target_code = ""
        for candidate_code in target_codes:
            lower_code = candidate_code.lower()
            aliases = {
                lower_code,
                lower_code.replace("-", ""),
                lower_code.replace("c-", "c", 1),
            }
            if any(alias in node_text for alias in aliases):
                target_code = candidate_code
                break
        if not target_code and "实验方案设计" in node_text:
            target_code = "C-04-01"
        elif not target_code and ("数据分析与解释" in node_text or "数据记录与分析" in node_text):
            target_code = "C-04-02"
        elif not target_code and "可行性与影响考量" in node_text:
            target_code = "C-03-02"
        elif not target_code:
            target_code = target_codes[i % len(target_codes)]
        is_course = str(node.get("kind", "")).lower() == "course"
        name = node.get("name") or node.get("code") or "节点"
        targeted = (
            target_code.lower() in node_text
            or target_code.lower().replace("-", "") in node_text
            or target_code.lower().replace("c-", "c", 1) in node_text
        )
        items.append(
            RelationItem(
                source_id=str(node.get("id") or node.get("code") or ""),
                target_id=target_code,
                relation_type="SUPPORTS",
                strength="strong" if is_course or targeted else "medium",
                confidence=0.92 if targeted else (0.90 if is_course else 0.78),
                reasoning=(
                    f"材料明确写明「{name}」支撑指标 {target_code}，可作为该指标的强支撑证据"
                    if targeted
                    else (
                    f"核心课程「{name}」直接覆盖指标 {target_code} 的教学与考核要求"
                    if is_course
                    else f"实验「{name}」训练了指标 {target_code} 对应的实践能力（间接支撑）"
                    )
                ),
            )
        )
    return items


def get_evidence_relation_items(
    school_nodes: list[dict],
    standard_nodes: list[dict],
) -> list[RelationItem]:
    """Infer only relationships backed by an explicit indicator reference."""
    sources = [
        node
        for node in school_nodes
        if str(node.get("kind", "")).lower() in ("course", "experiment")
    ]
    if any(str(node.get("kind", "")).lower() == "experiment" for node in sources):
        sources = [
            node
            for node in sources
            if str(node.get("kind", "")).lower() == "experiment"
        ]

    target_codes = [
        str(node.get("code") or "")
        for node in standard_nodes
        if str(node.get("kind", "")).lower() == "competency" and node.get("code")
    ]
    phrase_targets = {
        "实验方案设计": "C-04-01",
        "数据分析与解释": "C-04-02",
        "数据记录与分析": "C-04-02",
        "可行性与影响考量": "C-03-02",
    }

    items: list[RelationItem] = []
    for node in sources:
        properties = node.get("properties") or {}
        node_text = " ".join(
            str(part or "")
            for part in (
                node.get("id"),
                node.get("code"),
                node.get("name"),
                node.get("description"),
                properties.get("sourceExcerpt")
                if isinstance(properties, dict)
                else "",
            )
        ).lower()
        target_code = ""
        for candidate_code in target_codes:
            lower_code = candidate_code.lower()
            aliases = {
                lower_code,
                lower_code.replace("-", ""),
                lower_code.replace("c-", "c", 1),
            }
            if any(alias in node_text for alias in aliases):
                target_code = candidate_code
                break
        if not target_code:
            for phrase, candidate_code in phrase_targets.items():
                if phrase.lower() in node_text and candidate_code in target_codes:
                    target_code = candidate_code
                    break
        if not target_code:
            continue

        name = str(node.get("name") or node.get("code") or "教学节点")
        items.append(
            RelationItem(
                source_id=str(node.get("id") or node.get("code") or ""),
                target_id=target_code,
                relation_type="SUPPORTS",
                strength="strong",
                confidence=0.92,
                reasoning=(
                    f"材料节点“{name}”明确包含指标 {target_code} 或对应能力表述，"
                    "由证据规则生成待审核关系；教师确认后才计入覆盖度。"
                ),
            )
        )
    return items


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
                expected_effect="预计可将支撑强度从 weak 提升至 medium，"
                "达成度提升 15-20%。",
            ))
        else:
            items.append(SuggestionItem(
                target_code=code,
                target_name=name,
                root_cause=f"能力指标 {code}（{name}）存在数据孤岛，部分支撑节点未关联到实验或知识点。",
                suggestion="建议完善课程-实验-知识点之间的覆盖关系边。",
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
