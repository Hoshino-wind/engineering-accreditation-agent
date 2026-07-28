import type { DiagnosticFinding } from './diagnosticFinding';

export const prototypeOnlyStructureFindings = [
  {
    id: 'finding-ca-objective-concentration',
    title: '课程目标支撑过度集中',
    course: '计算机组成原理',
    type: 'structural-risk',
    risk: 'medium',
    sourceNode: '5 个实验项目',
    relationLabel: '集中支撑',
    targetNode: '课程目标 CT-2',
    graphVersion: '图谱 v0.3',
    materialSnapshot: '2026-07-28',
    ruleSetVersion: '规则集 v2.4',
    suggestedDestination: 'M7',
    rule: {
      id: 'support-concentration',
      version: 'v2.1',
      kind: 'deterministic',
      rationale:
        '本课程 5 个实验均支撑 CT-2，而 CT-1 与 CT-3 没有实验支撑，覆盖分布明显失衡。',
      basis: '结构分布阈值：单目标集中度不高于 70%',
      runAt: '2026-07-28 10:26',
    },
    impact: {
      courseObjectives: 3,
      abilityNodes: 4,
      evaluationInputs: 5,
    },
    path: [
      { id: 'ca-objective-1', label: '课程目标', detail: 'CT-1' },
      {
        id: 'ca-objective-2',
        label: '课程目标',
        detail: 'CT-2 · 100%',
        tone: 'danger',
        brokenAfter: true,
      },
      {
        id: 'ca-objective-3',
        label: '课程目标',
        detail: 'CT-3',
        tone: 'target',
      },
    ],
    evidence: [
      {
        id: 'ca-graph-snapshot-v03',
        objectName: '计算机组成原理图谱快照',
        objectVersion: 'v0.3',
        coordinate: '课程目标—实验关系矩阵',
        excerpt: '5 个有效实验项目均指向课程目标 CT-2。',
        hash: 'SHA256 5bd8…aa21',
      },
    ],
  },
  {
    id: 'finding-db-resource-expired',
    title: '教学资源版本失效',
    course: '数据库系统',
    type: 'version-impact',
    risk: 'low',
    sourceNode: '实验：索引性能分析',
    relationLabel: '使用',
    targetNode: '实验指导书 v1',
    graphVersion: '图谱 v0.3',
    materialSnapshot: '2026-07-28',
    ruleSetVersion: '规则集 v2.4',
    suggestedDestination: 'M3',
    rule: {
      id: 'resource-version-validity',
      version: 'v1.5',
      kind: 'deterministic',
      rationale:
        '正式关系仍引用已被 v2 替代的指导书版本，需要确认是否迁移来源。',
      basis: '资源版本有效性约束 4.1',
      runAt: '2026-07-28 10:26',
    },
    impact: {
      courseObjectives: 1,
      abilityNodes: 1,
      evaluationInputs: 0,
    },
    path: [
      { id: 'db-experiment', label: '实验', detail: '索引性能分析' },
      {
        id: 'db-resource-v1',
        label: '教学资源',
        detail: '指导书 v1',
        tone: 'danger',
        brokenAfter: true,
      },
      {
        id: 'db-resource-v2',
        label: '当前版本',
        detail: '指导书 v2',
        tone: 'target',
      },
    ],
    evidence: [
      {
        id: 'db-guide-v1-version',
        objectName: '数据库系统实验指导书',
        objectVersion: 'v1',
        coordinate: '版本记录',
        excerpt: 'v1 已于 2026-02-01 被 v2 替代。',
        hash: 'SHA256 c195…7b40',
      },
    ],
  },
] as const satisfies DiagnosticFinding[];
