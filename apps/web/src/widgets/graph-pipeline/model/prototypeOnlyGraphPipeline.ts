export type GraphPipelineStageStatus =
  | 'complete'
  | 'active'
  | 'blocked'
  | 'pending';

export interface GraphPipelineStage {
  actionLabel: string;
  code: string;
  description: string;
  key: string;
  percent: number;
  route: string;
  status: GraphPipelineStageStatus;
  title: string;
}

export const prototypeOnlyGraphPipeline: GraphPipelineStage[] = [
  {
    key: 'resources',
    actionLabel: '继续准备材料',
    code: 'M3',
    title: '教学资源',
    description: '92 / 104 份材料就绪',
    percent: 88,
    route: '/resources',
    status: 'complete',
  },
  {
    key: 'recognition',
    actionLabel: '审核待确认关系',
    code: 'M4',
    title: '识别与审核',
    description: '27 条能力与关系候选待确认',
    percent: 73,
    route: '/recognition',
    status: 'active',
  },
  {
    key: 'graph',
    actionLabel: '发布正式图谱',
    code: 'M2',
    title: '正式图谱',
    description: '2 组能力关系修订待发布',
    percent: 68,
    route: '/graph',
    status: 'active',
  },
  {
    key: 'diagnosis',
    actionLabel: '处理能力路径断点',
    code: 'M5',
    title: '图谱诊断',
    description: '8 条培养或评价路径仍有断点',
    percent: 55,
    route: '/diagnostics',
    status: 'blocked',
  },
  {
    key: 'evaluation',
    actionLabel: '补齐评价输入',
    code: 'M6',
    title: '达成度评价',
    description: '2 门课程输入未就绪',
    percent: 42,
    route: '/evaluations',
    status: 'blocked',
  },
  {
    key: 'improvement',
    actionLabel: '跟进教学改进',
    code: 'M7',
    title: '教学改进',
    description: '4 项措施正在执行',
    percent: 20,
    route: '/improvements',
    status: 'pending',
  },
  {
    key: 'support',
    actionLabel: '生成认证支撑',
    code: 'M8',
    title: '认证支撑',
    description: '等待闭环数据',
    percent: 10,
    route: '/support',
    status: 'pending',
  },
];

export function getPrimaryGraphPipelineStage(
  stages: GraphPipelineStage[] = prototypeOnlyGraphPipeline,
) {
  return stages.find((stage) => stage.status !== 'complete') ?? stages.at(-1);
}
