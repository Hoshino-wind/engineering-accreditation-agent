import type { DiagnosticFinding } from './diagnosticFinding';

export const prototypeOnlyCoverageFindings = [
  {
    id: 'finding-os-assessment-ability-gap',
    title: '评分项未关联能力节点',
    course: '操作系统',
    type: 'coverage-gap',
    risk: 'high',
    sourceNode: '评分项：实验报告正确性',
    relationLabel: '评价',
    targetNode: '能力节点 BA-2',
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
        id: 'indicator-ba-2-1',
        label: '指标点',
        detail: 'BA-2.1',
      },
      {
        id: 'objective-ct-3',
        label: '课程目标',
        detail: 'CT-3',
      },
      {
        id: 'experiment-process-scheduling',
        label: '实验',
        detail: '进程调度算法实现',
      },
      {
        id: 'rubric-correctness',
        label: '评分项',
        detail: '实验报告正确性',
        tone: 'danger',
        brokenAfter: true,
      },
      {
        id: 'ability-ba-2',
        label: '能力',
        detail: 'BA-2',
        tone: 'target',
      },
    ],
    evidence: [
      {
        id: 'os-rubric-v3-table-2-3',
        objectName: '操作系统实验评分表',
        objectVersion: 'v3',
        coordinate: '第 6 页 · 表 2-3',
        excerpt:
          '实验报告正确性占 30%，用于评价进程调度算法实现的正确程度和边界条件处理。',
        hash: 'SHA256 1e7a…9c02',
      },
      {
        id: 'os-syllabus-v2-section-4',
        objectName: '操作系统课程教学大纲',
        objectVersion: 'v2',
        coordinate: '第 12 页 · 4.2 实验教学目标',
        excerpt:
          '进程调度实验支撑课程目标 CT-3，并用于培养系统思维与方案评价能力。',
        hash: 'SHA256 4bd2…817f',
      },
    ],
  },
  {
    id: 'finding-se-missing-rubric',
    title: '实验缺少有效评分项',
    course: '软件工程',
    type: 'coverage-gap',
    risk: 'high',
    sourceNode: '实验：需求规格说明评审',
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
      { id: 'se-objective', label: '课程目标', detail: 'CT-4' },
      {
        id: 'se-experiment',
        label: '实验',
        detail: '需求规格说明评审',
        tone: 'danger',
        brokenAfter: true,
      },
      {
        id: 'se-rubric',
        label: '评分项',
        detail: '未配置',
        tone: 'target',
      },
    ],
    evidence: [
      {
        id: 'se-guide-v2-section-6',
        objectName: '软件工程课程设计指导书',
        objectVersion: 'v2',
        coordinate: '第 24 页 · 任务六',
        excerpt: '组织需求规格说明评审，并提交评审问题清单。',
        hash: 'SHA256 e3c8…4f12',
      },
    ],
  },
] as const satisfies DiagnosticFinding[];
