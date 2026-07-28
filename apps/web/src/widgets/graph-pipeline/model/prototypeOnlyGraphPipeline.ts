export type GraphPipelineStageStatus =
  | 'complete'
  | 'active'
  | 'blocked'
  | 'pending';

export interface GraphPipelineStage {
  code: string;
  description: string;
  key: string;
  percent: number;
  status: GraphPipelineStageStatus;
  title: string;
}

export const prototypeOnlyGraphPipeline: GraphPipelineStage[] = [
  {
    key: 'resources',
    code: 'M3',
    title: '教学资源',
    description: '92 / 104 份材料就绪',
    percent: 88,
    status: 'complete',
  },
  {
    key: 'recognition',
    code: 'M4',
    title: '识别与审核',
    description: '27 条候选待教师确认',
    percent: 73,
    status: 'active',
  },
  {
    key: 'graph',
    code: 'M2',
    title: '正式图谱',
    description: '326 个节点 · 418 条关系',
    percent: 68,
    status: 'active',
  },
  {
    key: 'diagnosis',
    code: 'M5',
    title: '图谱诊断',
    description: '8 个问题仍未处理',
    percent: 55,
    status: 'blocked',
  },
  {
    key: 'evaluation',
    code: 'M6',
    title: '达成度评价',
    description: '2 门课程输入未就绪',
    percent: 42,
    status: 'blocked',
  },
  {
    key: 'improvement',
    code: 'M7',
    title: '教学改进',
    description: '4 项措施正在执行',
    percent: 20,
    status: 'pending',
  },
  {
    key: 'support',
    code: 'M8',
    title: '认证支撑',
    description: '等待闭环数据',
    percent: 10,
    status: 'pending',
  },
];
