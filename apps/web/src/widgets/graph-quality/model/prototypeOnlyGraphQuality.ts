export interface GraphQualityMetric {
  description: string;
  key: string;
  label: string;
  percent: number;
  target: number;
}

export const prototypeOnlyGraphQuality: GraphQualityMetric[] = [
  {
    key: 'source-coverage',
    label: '节点来源完整率',
    description: '正式节点能定位到有效材料片段',
    percent: 94,
    target: 100,
  },
  {
    key: 'edge-review',
    label: '关系审核完成率',
    description: '关系具备审核决定和适用版本',
    percent: 86,
    target: 100,
  },
  {
    key: 'evaluation-path',
    label: '评价路径完整率',
    description: '评分项可上溯至能力和指标点',
    percent: 72,
    target: 100,
  },
  {
    key: 'material-consistency',
    label: '材料一致性通过率',
    description: '大纲、指导书和评分表无关键冲突',
    percent: 81,
    target: 95,
  },
];
