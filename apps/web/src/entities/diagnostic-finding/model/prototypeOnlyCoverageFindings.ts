import type { DiagnosticFinding } from './diagnosticFinding';

export const prototypeOnlyCoverageFindings = [
  {
    id: 'finding-mcu-assessment-ability-gap',
    title: '评分项未关联能力节点',
    course: '单片机基础',
    type: 'coverage-gap',
    risk: 'high',
    sourceNode: '评分项：实验报告正确性',
    relationLabel: '评价',
    targetNode: '能力节点 C-05-01',
    graphVersion: '图谱 v0.3',
    materialSnapshot: '2026-07-28',
    ruleSetVersion: '规则集 v2.4',
    suggestedDestination: 'M4',
    rule: {
      id: 'coverage-rule',
      version: 'v2.4',
      kind: 'deterministic',
      rationale:
        '评分项已关联实验，但没有连接到任何能力节点，导致评价输入无法形成完整上溯路径。',
      basis: '图谱覆盖性约束 2.1.1—2.1.3',
      runAt: '2026-07-28 10:26',
    },
    impact: {
      courseObjectives: 1,
      abilityNodes: 1,
      evaluationInputs: 2,
    },
    path: [
      {
        id: 'indicator-c-05-01',
        label: '指标点',
        detail: 'C-05-01',
      },
      {
        id: 'objective-mcu-3',
        label: '课程目标',
        detail: '课程目标 3',
      },
      {
        id: 'experiment-system-design',
        label: '实验',
        detail: '系统设计',
      },
      {
        id: 'rubric-correctness',
        label: '评分项',
        detail: '实验报告正确性',
        tone: 'danger',
        brokenAfter: true,
      },
      {
        id: 'ability-c-05-01',
        label: '能力',
        detail: 'C-05-01',
        tone: 'target',
      },
    ],
    evidence: [
      {
        id: 'mcu-rubric-v3-table-2-3',
        objectName: '单片机基础实验评分表',
        objectVersion: 'v3',
        coordinate: '第 6 页 · 表 2-3',
        excerpt:
          '实验报告正确性占 30%，用于评价 STM32 系统设计实验的 GPIO 配置与传感器数据采集正确程度。',
        hash: 'SHA256 1e7a…9c02',
      },
      {
        id: 'mcu-syllabus-v2-section-4',
        objectName: '单片机基础课程教学大纲',
        objectVersion: 'v2',
        coordinate: '第 12 页 · 4.2 实验教学目标',
        excerpt:
          '系统设计实验支撑课程目标 3，并用于培养现代工具选择与使用能力。',
        hash: 'SHA256 4bd2…817f',
      },
    ],
  },
  {
    id: 'finding-emb-missing-rubric',
    title: '实验缺少有效评分项',
    course: '嵌入式系统原理',
    type: 'coverage-gap',
    risk: 'high',
    sourceNode: '实验：LED流水灯',
    relationLabel: '采用',
    targetNode: '评分项',
    graphVersion: '图谱 v0.3',
    materialSnapshot: '2026-07-28',
    ruleSetVersion: '规则集 v2.4',
    suggestedDestination: 'M4',
    rule: {
      id: 'experiment-rubric-coverage',
      version: 'v2.4',
      kind: 'deterministic',
      rationale:
        '实验项目处于有效状态，但没有任何有效评分项，无法进入达成度评价。',
      basis: '实验评价路径完整性约束 2.3.1',
      runAt: '2026-07-28 10:26',
    },
    impact: {
      courseObjectives: 1,
      abilityNodes: 2,
      evaluationInputs: 3,
    },
    path: [
      { id: 'emb-objective', label: '课程目标', detail: '课程目标 4' },
      {
        id: 'emb-experiment',
        label: '实验',
        detail: 'LED流水灯',
        tone: 'danger',
        brokenAfter: true,
      },
      {
        id: 'emb-rubric',
        label: '评分项',
        detail: '未配置',
        tone: 'target',
      },
    ],
    evidence: [
      {
        id: 'emb-guide-v2-section-6',
        objectName: '嵌入式系统原理实验指导书',
        objectVersion: 'v2',
        coordinate: '第 24 页 · 任务六',
        excerpt: '基于 Verilog HDL 在 FPGA 上完成 LED流水灯设计，并提交工程文件。',
        hash: 'SHA256 e3c8…4f12',
      },
    ],
  },
] as const satisfies DiagnosticFinding[];
