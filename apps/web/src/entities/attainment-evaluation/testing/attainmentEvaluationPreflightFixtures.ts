import type { AttainmentEvaluationPreflight } from '../model/attainmentEvaluation';

export const attainmentEvaluationPreflightFixtures: Record<
  string,
  AttainmentEvaluationPreflight
> = {
  'eval-2026-068': {
    blockedCheckCount: 2,
    blockers: [
      '团队互评汇总缺少 6 名学生记录',
      '团队协作缺少有效得分率',
    ],
    checks: [
      {
        action: 'prepare_score_data',
        detail: '团队互评汇总缺少 6 名学生记录',
        id: 'scores',
        label: '评分数据不完整',
        owner: 'score_input',
        status: 'blocked',
      },
      {
        action: 'none',
        detail: '两项评分权重合计 100%',
        id: 'weights',
        label: '权重合计 100%',
        owner: 'evaluation_policy',
        status: 'pass',
      },
      {
        action: 'prepare_score_data',
        detail: '团队协作缺少有效得分率',
        id: 'calculation:missing-score:679e62dc26f400cf',
        label: '团队协作得分率缺失',
        owner: 'score_input',
        status: 'blocked',
      },
    ],
    evaluationObjectId: 'evaluation-ct5',
    inputSnapshotHash:
      'sha256:8d090000000000000000000000000000000000000000000000000000000017b3',
    missingInputs: [
      {
        evidenceName: '团队互评汇总 v1.0',
        id: 'input-teamwork',
        label: '团队协作',
      },
    ],
    passedCheckCount: 1,
    reportHash:
      'sha256:6800000000000000000000000000000000000000000000000000000000000068',
    reportVersion: 'evaluation-preflight:v1',
    runId: 'eval-2026-068',
    scope: 'pilot_snapshot',
    status: 'blocked',
  },
  'eval-2026-070': {
    blockedCheckCount: 1,
    blockers: ['评分项尚未关联正式能力节点'],
    checks: [
      {
        action: 'repair_graph_relation',
        detail: '评分项尚未关联正式能力节点',
        id: 'relations',
        label: '正式关系不完整',
        owner: 'ability_graph',
        status: 'blocked',
      },
      {
        action: 'none',
        detail: '评分数据与样本范围完整',
        id: 'scores',
        label: '评分数据完整',
        owner: 'score_input',
        status: 'pass',
      },
    ],
    evaluationObjectId: 'evaluation-ct1',
    inputSnapshotHash:
      'sha256:9fa400000000000000000000000000000000000000000000000000000000226d',
    missingInputs: [],
    passedCheckCount: 1,
    reportHash:
      'sha256:7000000000000000000000000000000000000000000000000000000000000070',
    reportVersion: 'evaluation-preflight:v1',
    runId: 'eval-2026-070',
    scope: 'pilot_snapshot',
    status: 'blocked',
  },
  'eval-2026-071': {
    blockedCheckCount: 0,
    blockers: [],
    checks: [
      {
        action: 'none',
        detail: '关系、权重、评分和异常校验均通过',
        id: 'ready',
        label: '全部输入就绪',
        owner: 'evaluation_owner',
        status: 'pass',
      },
    ],
    evaluationObjectId: 'evaluation-ct6',
    inputSnapshotHash:
      'sha256:cd5100000000000000000000000000000000000000000000000000000000641e',
    missingInputs: [],
    passedCheckCount: 1,
    reportHash:
      'sha256:7100000000000000000000000000000000000000000000000000000000000071',
    reportVersion: 'evaluation-preflight:v1',
    runId: 'eval-2026-071',
    scope: 'pilot_snapshot',
    status: 'ready',
  },
};
