import type {
  AttainmentEvaluationItem,
  AttainmentEvaluationObjectList,
  AttainmentEvaluationSummary,
} from '../model/attainmentEvaluation';

export const attainmentEvaluationObjectListFixture: AttainmentEvaluationObjectList = {
  items: [
    {
      abilityCode: 'BA-2',
      abilityName: '算法分析与设计能力',
      approvalStatus: 'pending',
      course: '数据结构',
      id: 'evaluation-ct3',
      objectiveCode: 'CT-3',
      objectiveName: '算法设计正确性',
      outcome: 'achieved',
      presentedRunId: 'eval-2026-066',
      readinessStatus: 'ready',
      score: 0.82,
      status: 'awaiting-review',
    },
    {
      abilityCode: 'BA-4',
      abilityName: '系统实现与调试能力',
      approvalStatus: 'approved',
      course: '软件工程',
      id: 'evaluation-ct4',
      objectiveCode: 'CT-4',
      objectiveName: '系统实现与调试能力',
      outcome: 'achieved',
      presentedRunId: 'eval-2026-067',
      readinessStatus: 'ready',
      score: 0.779,
      status: 'approved',
    },
    {
      abilityCode: 'BA-1',
      abilityName: '离散建模与问题求解能力',
      approvalStatus: 'approved',
      course: '离散数学',
      id: 'evaluation-ct2',
      objectiveCode: 'CT-2',
      objectiveName: '问题建模能力',
      outcome: 'achieved',
      presentedRunId: 'eval-2026-069',
      readinessStatus: 'ready',
      score: 0.74,
      status: 'approved',
    },
    {
      abilityCode: 'BA-6',
      abilityName: '团队协作与沟通能力',
      approvalStatus: 'not_submitted',
      course: '软件工程',
      id: 'evaluation-ct5',
      objectiveCode: 'CT-5',
      objectiveName: '团队协作与沟通能力',
      presentedRunId: 'eval-2026-068',
      readinessStatus: 'blocked',
      status: 'blocked',
    },
    {
      abilityCode: 'BA-3',
      abilityName: '体系结构分析能力',
      approvalStatus: 'not_submitted',
      course: '计算机组成原理',
      id: 'evaluation-ct1',
      objectiveCode: 'CT-1',
      objectiveName: '体系结构分析能力',
      presentedRunId: 'eval-2026-070',
      readinessStatus: 'blocked',
      status: 'blocked',
    },
    {
      abilityCode: 'BA-5',
      abilityName: '工程规范与职业伦理',
      approvalStatus: 'pending',
      course: '计算机网络',
      id: 'evaluation-ct6',
      objectiveCode: 'CT-6',
      objectiveName: '工程规范与伦理',
      outcome: 'not-achieved',
      presentedRunId: 'eval-2026-071',
      readinessStatus: 'ready',
      score: 0.68,
      status: 'not-achieved',
    },
  ],
  total: 6,
};

const scoreByRunId: Record<string, number | undefined> = {
  'eval-2026-066': 0.82,
  'eval-2026-067': 0.779,
  'eval-2026-068': undefined,
  'eval-2026-069': 0.74,
  'eval-2026-070': undefined,
  'eval-2026-071': 0.68,
  'eval-2026-072': 0.73,
};

function buildRunFixture(
  summary: AttainmentEvaluationSummary,
  runId = summary.presentedRunId,
): AttainmentEvaluationItem {
  const score = scoreByRunId[runId];
  const ready = summary.readinessStatus === 'ready';
  const threshold = runId === 'eval-2026-072' ? 0.75 : 0.7;
  const scoreSnapshot =
    runId === 'eval-2026-071'
      ? '2026-05-12'
      : runId === 'eval-2026-072'
        ? '2026-07-20'
        : '2026-07-28';
  const outcome =
    score === undefined
      ? undefined
      : score >= threshold
        ? 'achieved'
        : 'not-achieved';
  return {
    abilityCode: summary.abilityCode,
    abilityName: summary.abilityName,
    approvalStatus: summary.approvalStatus,
    calculation: {
      blockers: ready ? [] : ['评分数据或正式关系尚未就绪'],
      contributions: [
        {
          input: {
            evidenceName: `${summary.course}评分汇总表`,
            id: 'input-primary',
            label: '主要评价输入',
            scoreRate: score,
            weight: 1,
          },
          value: score,
        },
      ],
      outcome,
      ready,
      score,
      weightTotal: 1,
    },
    course: summary.course,
    evidence: [],
    graphVersion: runId === 'eval-2026-072' ? '图谱 v0.4' : '图谱 v0.3',
    id: summary.id,
    inputSnapshot: {
      createdAt: `${scoreSnapshot} 09:42`,
      hash: 'sha256:test-fixture',
    },
    inputs: [
      {
        evidenceName: `${summary.course}评分汇总表`,
        id: 'input-primary',
        label: '主要评价输入',
        scoreRate: score,
        weight: 1,
      },
    ],
    objectiveCode: summary.objectiveCode,
    objectiveName: summary.objectiveName,
    policyVersion: 'policy v1.2',
    programVersion: 'evaluator 0.8.0',
    readinessChecks: [
      {
        detail: ready ? '全部输入就绪' : '存在阻断项',
        id: 'ready',
        label: ready ? '全部输入就绪' : '输入未就绪',
        status: ready ? 'pass' : 'blocked',
      },
    ],
    readinessStatus: summary.readinessStatus,
    runId,
    scoreSnapshot,
    status: summary.status,
    studentCount: 42,
    threshold,
  };
}

export const attainmentEvaluationRunFixtures = Object.fromEntries(
  attainmentEvaluationObjectListFixture.items.map((summary) => [
    summary.presentedRunId,
    buildRunFixture(summary),
  ]),
) as Record<string, AttainmentEvaluationItem>;

const ct6Summary = attainmentEvaluationObjectListFixture.items.find(
  (summary) => summary.id === 'evaluation-ct6',
);

if (ct6Summary) {
  attainmentEvaluationRunFixtures['eval-2026-072'] =
    buildRunFixture(ct6Summary, 'eval-2026-072');
}
