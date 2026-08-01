import type { AttainmentEvaluationItem } from './attainmentEvaluation';

export const prototypeOnlyBlockedEvaluations: AttainmentEvaluationItem[] = [
  {
    abilityCode: 'C-05-01',
    abilityName: '现代工具选择与使用',
    course: '单片机基础',
    evidence: [],
    graphVersion: '图谱 v0.3',
    id: 'evaluation-mcu-tool',
    inputSnapshot: {
      createdAt: '2026-07-28 08:36',
      hash: 'sha256:8d09…17b3',
    },
    inputs: [
      {
        evidenceName: '工具链操作评分汇总 v1.0',
        id: 'input-tool-selection',
        label: '开发工具选择与配置',
        weight: 0.5,
      },
      {
        evidenceName: 'Keil 调试评分表 v1.1',
        id: 'input-tool-usage',
        label: '工具使用熟练度',
        scoreRate: 0.79,
        weight: 0.5,
      },
    ],
    objectiveCode: 'CO-MCU-2',
    objectiveName: '课程目标2：开发工具选择与使用',
    policyVersion: 'policy v1.2',
    programVersion: 'evaluator 0.8.0',
    readinessChecks: [
      {
        detail: '工具链操作评分汇总缺少 6 名学生记录',
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
    abilityCode: 'C-01-02',
    abilityName: '问题推演与分析',
    course: '嵌入式系统原理',
    evidence: [],
    graphVersion: '图谱 v0.3',
    id: 'evaluation-fpga-reasoning',
    inputSnapshot: {
      createdAt: '2026-07-28 08:10',
      hash: 'sha256:9fa4…226d',
    },
    inputs: [
      {
        evidenceName: 'FPGA 时序分析实验评分表 v1.0',
        id: 'input-timing',
        label: '时序推演分析',
        scoreRate: 0.81,
        weight: 1,
      },
    ],
    objectiveCode: 'CO-FPGA-2',
    objectiveName: '课程目标2：时序问题推演与分析',
    policyVersion: 'policy v1.2',
    programVersion: 'evaluator 0.8.0',
    readinessChecks: [
      {
        detail: '评分项尚未关联正式能力指标节点',
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
