// 能力图谱节点类型，对应本地 Neo4j Schema 的 6 层知识图谱
export type AbilityGraphNodeKind =
  | 'GraduationRequirement'
  | 'Competency'
  | 'Course'
  | 'Experiment'
  | 'KnowledgePoint'
  | 'TeachingResource';

// 关系类型，对应 Neo4j Schema 的 6 种边
export type AbilityGraphEdgeKind =
  | 'CONTAINS' // 毕业要求 → 能力
  | 'SUPPORTS_REQ' // 课程 → 毕业要求
  | 'BELONGS_TO' // 实验 → 课程
  | 'SUPPORTS' // 实验 → 能力
  | 'COVERS_KNOWLEDGE' // 实验 → 知识点
  | 'USES_RESOURCE'; // 实验 → 资源

// AI 推荐关系的来源与审核状态，对齐项目硬约束：AI 关系需教师确认后才参与计算
export type EdgeSource = 'ai' | 'manual' | 'rule';
export type EdgeReviewStatus = 'pending' | 'approved' | 'rejected' | 'modified';

// 节点来源：standard=系统内置认证标准（华盛顿协议毕业要求/能力指标，不可改）
//          school=学校上传数据（课程/实验/知识点/资源，AI提取+教师审核）
export type NodeOrigin = 'standard' | 'school';

export interface AbilityGraphNode {
  id: string;
  kind: AbilityGraphNodeKind;
  code: string;
  name: string;
  description?: string;
  origin?: NodeOrigin;
  // 业务属性，随节点类型变化
  properties?: Record<string, string | number | undefined>;
}

export interface AbilityGraphEdge {
  id: string;
  source: string;
  target: string;
  kind: AbilityGraphEdgeKind;
  sourceType: EdgeSource;
  reviewStatus: EdgeReviewStatus;
  strength?: 'strong' | 'medium' | 'weak';
  confidence?: number;
  aiReasoning?: string;
  materialResourceId?: string;
  materialVersionGroupId?: string;
  materialVersion?: string;
  materialName?: string;
}

export interface AbilityGraphData {
  nodes: AbilityGraphNode[];
  edges: AbilityGraphEdge[];
}
