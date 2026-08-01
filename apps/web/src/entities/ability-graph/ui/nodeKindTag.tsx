import { Tag } from 'antd';

import type {
  AbilityGraphEdgeKind,
  AbilityGraphNodeKind,
  EdgeReviewStatus,
  EdgeSource,
} from '../model/abilityGraph';

// 节点类型展示配置：颜色 / 中文标签 / 图标
// - color/bg/border 给 Tag 等"白底卡片"样式使用（筛选栏、审核面板等）
// - solid 给图谱节点使用（对齐原型图 [prototype.html#L837-L849] 的纯色块配色）：
//   毕业要求 #C53030 / 能力 #DD6B20 / 课程 #2B6CB0 / 实验 #6B46C1 / 知识点 #319795 / 资源 #2D7A4F
export const nodeKindPresentation: Record<
  AbilityGraphNodeKind,
  { color: string; label: string; bg: string; border: string; solid: string }
> = {
  GraduationRequirement: {
    color: '#C53030',
    label: '毕业要求',
    bg: '#fff5f5',
    border: '#feb2b2',
    solid: '#C53030',
  },
  Competency: {
    color: '#DD6B20',
    label: '能力指标',
    bg: '#fffaf0',
    border: '#feebc8',
    solid: '#DD6B20',
  },
  Course: {
    color: '#2B6CB0',
    label: '课程',
    bg: '#ebf8ff',
    border: '#90cdf4',
    solid: '#2B6CB0',
  },
  Experiment: {
    color: '#6B46C1',
    label: '实验项目',
    bg: '#faf5ff',
    border: '#d6bcfa',
    solid: '#6B46C1',
  },
  KnowledgePoint: {
    color: '#319795',
    label: '知识点',
    bg: '#e6fffa',
    border: '#81e6d9',
    solid: '#319795',
  },
  TeachingResource: {
    color: '#2D7A4F',
    label: '教学资源',
    bg: '#f0fff4',
    border: '#9ae6b4',
    solid: '#2D7A4F',
  },
};

export function NodeKindTag({ kind }: { kind: AbilityGraphNodeKind }) {
  const presentation = nodeKindPresentation[kind];
  return <Tag color={presentation.color}>{presentation.label}</Tag>;
}

// 关系类型中文标签
const edgeKindLabels: Record<AbilityGraphEdgeKind, string> = {
  CONTAINS: '包含',
  SUPPORTS_REQ: '支撑',
  BELONGS_TO: '归属',
  SUPPORTS: '支撑',
  COVERS_KNOWLEDGE: '覆盖',
  USES_RESOURCE: '使用',
};

export function EdgeKindTag({ kind }: { kind: AbilityGraphEdgeKind }) {
  return <Tag>{edgeKindLabels[kind]}</Tag>;
}

// 边来源标签：ai / manual / rule
const edgeSourceLabels: Record<EdgeSource, { color: string; label: string }> = {
  ai: { color: 'purple', label: 'AI推荐' },
  manual: { color: 'blue', label: '人工' },
  rule: { color: 'default', label: '规则' },
};

export function EdgeSourceTag({ source }: { source: EdgeSource }) {
  const config = edgeSourceLabels[source];
  return <Tag color={config.color}>{config.label}</Tag>;
}

// 审核状态标签，对齐项目硬约束：AI 关系需教师确认后才参与计算
const reviewStatusLabels: Record<EdgeReviewStatus, { color: string; label: string }> = {
  pending: { color: 'orange', label: '待审核' },
  approved: { color: 'green', label: '已通过' },
  rejected: { color: 'red', label: '已驳回' },
  modified: { color: 'cyan', label: '修改后通过' },
};

export function EdgeReviewStatusTag({ status }: { status: EdgeReviewStatus }) {
  const config = reviewStatusLabels[status];
  return <Tag color={config.color}>{config.label}</Tag>;
}
