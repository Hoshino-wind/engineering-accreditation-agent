import type { AttainmentEvaluationItem } from './attainmentEvaluation';

export const prototypeOnlyBlockedEvaluations: AttainmentEvaluationItem[] = [
  {
    abilityCode: 'BA-6',
    abilityName: '团队协作与沟通能力',
    course: '软件工程',
    evidence: [],
    graphVersion: '图谱 v0.3',
    id: 'evaluation-ct5',
    inputSnapshot: {
      createdAt: '2026-07-28 08:36',
      hash: 'sha256:8d09…17b3',
    },
    inputs: [
      {
        evidenceName: '团队互评汇总 v1.0',
        id: 'input-teamwork',
        label: '团队协作',
        weight: 0.5,
      },
      {
        evidenceName: '汇报评分表 v1.1',
        id: 'input-communication',
        label: '表达与沟通',
        scoreRate: 0.79,
        weight: 0.5,
      },
    ],
    objectiveCode: 'CT-5',
    objectiveName: '团队协作与沟通能力',
    policyVersion: 'policy v1.2',
    programVersion: 'evaluator 0.8.0',
    readinessChecks: [
      {
        detail: '团队互评汇总缺少 6 名学生记录',
        id: 'scores',
        label: '评分数据不完整',
        status: 'blocked',
      },
      {
        detail: '两项评分权重合计 100%',
        id: 'weights',
        label: '权重合计 100%',
        status: 'pass',
      },
    ],
    scoreSnapshot: '2026-07-28',
    status: 'blocked',
    studentCount: 36,
    threshold: 0.7,
  },
  {
    abilityCode: 'BA-3',
    abilityName: '体系结构分析能力',
    course: '计算机组成原理',
    evidence: [],
    graphVersion: '图谱 v0.3',
    id: 'evaluation-ct1',
    inputSnapshot: {
      createdAt: '2026-07-28 08:10',
      hash: 'sha256:9fa4…226d',
    },
    inputs: [
      {
        evidenceName: '体系结构实验评分表 v1.0',
        id: 'input-architecture',
        label: '体系结构分析',
        scoreRate: 0.81,
        weight: 1,
      },
    ],
    objectiveCode: 'CT-1',
    objectiveName: '体系结构分析能力',
    policyVersion: 'policy v1.2',
    programVersion: 'evaluator 0.8.0',
    readinessChecks: [
      {
        detail: '评分项尚未关联正式能力节点',
        id: 'relations',
        label: '正式关系不完整',
        status: 'blocked',
      },
      {
        detail: '评分数据与样本范围完整',
        id: 'scores',
        label: '评分数据完整',
        status: 'pass',
      },
    ],
    scoreSnapshot: '2026-07-28',
    status: 'blocked',
    studentCount: 41,
    threshold: 0.7,
  },
];
