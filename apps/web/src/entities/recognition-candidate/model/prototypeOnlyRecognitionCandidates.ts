import type { RecognitionCandidate } from './recognitionCandidate';

// 识别审核候选数据 —— 统一专业方向：电子信息工程（嵌入式方向）
// 与 prototypeOnlyAbilityGraph 中 sourceType:'ai' & reviewStatus:'pending' 的 SUPPORTS 边保持一致：
//   exp-list  → std-c-01-01 / std-c-01-02
//   exp-system → std-c-05-01
//   exp-fpga-1 → std-c-03-01
// 所有 sourceNode / targetNode 均引用真实图谱节点（学校节点）与标准库节点（GR / C 指标点）。

export const prototypeOnlyRecognitionCandidates: RecognitionCandidate[] = [
  {
    id: 'candidate-list-c0101',
    title: '“链表实现”实验支撑能力指标 C-01-01',
    course: '数据结构与算法',
    candidateType: '关系候选',
    confidence: 92,
    risk: 'highImpact',
    sourceNode: '链表实现实验',
    relation: '支撑',
    targetNode: '能力指标 C-01-01 工程知识应用',
    explanation:
      '实验要求理解线性表存储结构并实现插入、删除、查找、反转等操作，直接支撑学生运用工程知识正确表述与求解复杂工程问题的能力。',
    processorVersion: 'recognition-pipeline v3.2',
    generatedAt: '2026-07-29 09:14',
    impact: { courseObjectives: 1, abilityNodes: 1, rubricItems: 2 },
    evidence: [
      {
        id: 'evidence-list-01',
        resourceName: '数据结构与算法课程大纲',
        resourceVersion: 'v3',
        coordinate: '第 9 页 · 表 3-1 · 第 2 行',
        excerpt:
          '课程目标：能够运用线性表、树、图等数据结构组织与存储数据，并分析基本操作的时间复杂度。',
        hash: 'SHA256 7c21…a40f',
      },
      {
        id: 'evidence-list-02',
        resourceName: '实验指导书（数据结构分册）',
        resourceVersion: 'v2',
        coordinate: '第 18 页 · 实验一 · 任务 3',
        excerpt:
          '使用 C/C++ 实现单链表、双链表与循环链表，完成插入、删除、查找与反转，并对比顺序存储与链式存储的适用场景。',
        hash: 'SHA256 b903…5e17',
      },
    ],
  },
  {
    id: 'candidate-list-c0102',
    title: '“链表实现”实验支撑能力指标 C-01-02',
    course: '数据结构与算法',
    candidateType: '关系候选',
    confidence: 78,
    risk: 'normal',
    sourceNode: '链表实现实验',
    relation: '支撑',
    targetNode: '能力指标 C-01-02 问题推演与分析',
    explanation:
      '实验要求分析不同链表操作的复杂度边界并比较存储方案，体现出对复杂工程问题的推演、分析与方案比较。',
    processorVersion: 'recognition-pipeline v3.2',
    generatedAt: '2026-07-29 09:14',
    impact: { courseObjectives: 1, abilityNodes: 1, rubricItems: 1 },
    evidence: [
      {
        id: 'evidence-list-02-01',
        resourceName: '实验指导书（数据结构分册）',
        resourceVersion: 'v2',
        coordinate: '第 22 页 · 实验一 · 思考题',
        excerpt:
          '对比单链表与双链表在反向遍历上的开销，分析插入/删除操作的平均时间复杂度，并给出选型依据。',
        hash: 'SHA256 31ad…c862',
      },
    ],
  },
  {
    id: 'candidate-system-c0501',
    title: '“系统设计”实验支撑能力指标 C-05-01',
    course: '单片机基础',
    candidateType: '关系候选',
    confidence: 85,
    risk: 'highImpact',
    sourceNode: '系统设计实验',
    relation: '支撑',
    targetNode: '能力指标 C-05-01 现代工具选择与使用',
    explanation:
      '综合实验使用 STM32 开发板、Keil 工具链与示波器等多类现代工程工具完成外设驱动与任务调度，明确体现现代工具的选择与使用。',
    processorVersion: 'recognition-pipeline v3.2',
    generatedAt: '2026-07-29 09:16',
    impact: { courseObjectives: 1, abilityNodes: 1, rubricItems: 2 },
    evidence: [
      {
        id: 'evidence-system-01',
        resourceName: '单片机与嵌入式实验指导书',
        resourceVersion: 'v1',
        coordinate: '第 54 页 · 实验六 · 实验环境',
        excerpt:
          '实验环境：STM32F103 开发板、Keil uVision5、ST-Link 调试器、数字示波器；要求完成 GPIO、定时器与 ADC 的协同调试。',
        hash: 'SHA256 9f40…2b7d',
      },
      {
        id: 'evidence-system-02',
        resourceName: '电子信息工程培养方案(2024版)',
        resourceVersion: 'v1',
        coordinate: '第 31 页 · 表 6-2 · 单片机基础',
        excerpt:
          '单片机基础课程支撑毕业要求 5（使用现代工具），要求学生能够选择并使用主流嵌入式开发工具完成系统调试。',
        hash: 'SHA256 d618…70aa',
      },
    ],
  },
  {
    id: 'candidate-fpga-c0301',
    title: '“LED 流水灯”实验支撑能力指标 C-03-01',
    course: '嵌入式系统原理',
    candidateType: '关系候选',
    confidence: 74,
    risk: 'lowConfidence',
    sourceNode: 'LED 流水灯实验',
    relation: '支撑',
    targetNode: '能力指标 C-03-01 系统设计方法',
    explanation:
      '实验要求设计状态机与分频逻辑，对应一定的系统设计能力，但作为入门实验覆盖深度有限，建议教师确认是否足以支撑 C-03-01。',
    processorVersion: 'recognition-pipeline v3.2',
    generatedAt: '2026-07-29 09:17',
    impact: { courseObjectives: 1, abilityNodes: 1, rubricItems: 1 },
    evidence: [
      {
        id: 'evidence-fpga-01',
        resourceName: 'FPGA数字系统设计实验项目清单',
        resourceVersion: 'v1',
        coordinate: '第 6 页 · 项目一 · 设计要点',
        excerpt:
          '基于 Verilog 设计分频模块与状态机，实现 LED 流水灯，理解时序逻辑与有限状态机的设计方法。',
        hash: 'SHA256 4e77…9c31',
      },
    ],
  },
  {
    id: 'candidate-sort-conflict',
    title: '“排序对比”实验支撑能力指标 C-01-01 冲突',
    course: '数据结构与算法',
    candidateType: '关系候选',
    confidence: 82,
    risk: 'conflict',
    sourceNode: '排序对比实验',
    relation: '支撑',
    targetNode: '能力指标 C-01-01 工程知识应用',
    explanation:
      '本次识别认为排序对比实验支撑 C-01-01，但正式图谱中已存在该实验到 C-01-01 的人工确认关系，需确认是新增证据还是重复推荐。',
    processorVersion: 'recognition-pipeline v3.2',
    generatedAt: '2026-07-29 09:18',
    impact: { courseObjectives: 1, abilityNodes: 1, rubricItems: 2 },
    conflictMessage:
      '正式图谱中已存在“排序对比实验 → C-01-01”关系（来源：人工确认，强度 medium）。',
    existingFormalValue: {
      sourceNode: '排序对比实验',
      relation: '支撑',
      targetNode: '能力指标 C-01-01 工程知识应用',
      version: '图谱 v0.3',
    },
    evidence: [
      {
        id: 'evidence-sort-01',
        resourceName: '实验指导书（数据结构分册）',
        resourceVersion: 'v2',
        coordinate: '第 47 页 · 实验四',
        excerpt:
          '实现并对比冒泡、快速排序、归并与堆排序，记录不同规模数据下的运行时间并分析稳定性与复杂度。',
        hash: 'SHA256 641a…ec72',
      },
    ],
  },
  {
    id: 'candidate-peripheral-c0301',
    title: '评分项“外设驱动”映射能力指标 C-03-01',
    course: '单片机基础',
    candidateType: '映射候选',
    confidence: 58,
    risk: 'lowConfidence',
    sourceNode: '评分项：外设驱动',
    relation: '评价',
    targetNode: '能力指标 C-03-01 系统设计方法',
    explanation:
      '评分项名称指向外设驱动实现，但评分描述较宽泛，尚不足以证明其完整评价系统设计方法，需结合评分细则确认。',
    processorVersion: 'recognition-pipeline v3.2',
    generatedAt: '2026-07-29 09:19',
    impact: { courseObjectives: 0, abilityNodes: 1, rubricItems: 1 },
    evidence: [
      {
        id: 'evidence-peripheral-01',
        resourceName: '单片机与嵌入式实验指导书',
        resourceVersion: 'v1',
        coordinate: '附录 B · 评分标准 · C3:C7',
        excerpt:
          '外设驱动：能够正确配置 GPIO、定时器与 ADC 并完成驱动编写，占总评分 35%。',
        hash: 'SHA256 aa27…0dd9',
      },
    ],
  },
  {
    id: 'candidate-gpio-duplicate',
    title: '候选能力“GPIO 配置”疑似与“嵌入式编程”重复',
    course: '单片机基础',
    candidateType: '节点候选',
    confidence: 88,
    risk: 'conflict',
    sourceNode: '候选能力：GPIO 配置',
    relation: '等价于',
    targetNode: '正式知识点：嵌入式编程',
    explanation:
      '候选名称“GPIO 配置”与正式知识点“嵌入式编程”语义高度重叠（后者已涵盖 GPIO 配置、定时器、中断、外设驱动），建议合并而非新建节点。',
    processorVersion: 'recognition-pipeline v3.2',
    generatedAt: '2026-07-29 09:20',
    impact: { courseObjectives: 1, abilityNodes: 2, rubricItems: 0 },
    conflictMessage:
      '正式图谱已有“嵌入式编程”知识点（KP-MCU-01），并被“系统设计”实验引用。',
    existingFormalValue: {
      sourceNode: '候选能力：GPIO 配置',
      relation: '等价于',
      targetNode: '正式知识点：嵌入式编程',
      version: '图谱 v0.3',
    },
    evidence: [
      {
        id: 'evidence-gpio-01',
        resourceName: '单片机与嵌入式实验指导书',
        resourceVersion: 'v1',
        coordinate: '第 12 页 · 2.1 GPIO 配置',
        excerpt:
          '配置 GPIO 工作模式（推挽/开漏/复用），完成 LED 控制与按键输入，并配合定时器实现 PWM 输出。',
        hash: 'SHA256 e8b2…671a',
      },
    ],
  },
];
