export const ABILITY_GRAPH_SCHEMA_VERSION_ID =
  'teaching-graph-schema@2';

export type AbilityGraphNodeType =
  | 'graduate-outcome'
  | 'performance-indicator'
  | 'course'
  | 'course-outcome'
  | 'ability'
  | 'skill'
  | 'knowledge'
  | 'experiment'
  | 'teaching-resource'
  | 'assessment-task'
  | 'rubric-criterion';

export type AbilityGraphObjectStatus =
  | 'effective'
  | 'draft'
  | 'superseded';

export type AbilityGraphReviewStatus = 'approved' | 'pending';

export type AbilityGraphCapabilityLevel =
  | 'understand'
  | 'apply'
  | 'analyze'
  | 'evaluate'
  | 'create';

export type AbilityGraphRelationType =
  | 'refines'
  | 'expects'
  | 'defines'
  | 'belongs-to'
  | 'supports'
  | 'contributes-to'
  | 'cultivates'
  | 'trains'
  | 'covers'
  | 'composed-of'
  | 'requires'
  | 'uses'
  | 'enables'
  | 'contains-task'
  | 'contains-criterion'
  | 'assesses';

export interface AbilityGraphSourceRef {
  coordinate: string;
  evidenceFragmentId: string;
  material: string;
  materialId: string;
  materialVersionId: string;
  sourceRefId: string;
  version: string;
}

export interface AbilityGraphCapabilitySemantics {
  cognitiveLevel: AbilityGraphCapabilityLevel;
  domain: string;
  observableBehaviors: string[];
}

export interface AbilityGraphCapabilityMapping {
  rationale: string;
  targetBehaviors: string[];
}

export interface AbilityGraphNode {
  capability?: AbilityGraphCapabilitySemantics;
  code: string;
  definition: string;
  id: string;
  name: string;
  nodeVersionId: string;
  owner: string;
  source: AbilityGraphSourceRef;
  status: AbilityGraphObjectStatus;
  type: AbilityGraphNodeType;
  version: string;
}

export interface AbilityGraphEdge {
  capabilityMapping?: AbilityGraphCapabilityMapping;
  edgeVersionId: string;
  effectiveCycle: string;
  id: string;
  relation: AbilityGraphRelationType;
  reviewStatus: AbilityGraphReviewStatus;
  source: AbilityGraphSourceRef;
  sourceId: string;
  sourceNodeVersionId: string;
  status: AbilityGraphObjectStatus;
  targetId: string;
  targetNodeVersionId: string;
}

export type AbilityGraphChangeKind = 'added' | 'modified' | 'removed';

export type AbilityGraphChangeEntityKind = 'node' | 'edge';

export type AbilityGraphDownstreamModule = 'M5' | 'M6' | 'M8';

export type AbilityGraphImpactAction =
  | 'recheck'
  | 'recalculate'
  | 'refresh';

export interface AbilityGraphPublishedSnapshot {
  edges: AbilityGraphEdge[];
  nodes: AbilityGraphNode[];
  publishedAt: string;
  schemaVersionId: typeof ABILITY_GRAPH_SCHEMA_VERSION_ID;
  version: string;
}

export interface AbilityGraphDownstreamReference {
  edgeIds: string[];
  edgeVersionIds: string[];
  graphVersion: string;
  id: string;
  label: string;
  module: AbilityGraphDownstreamModule;
  nodeIds: string[];
  nodeVersionIds: string[];
  objectCode: string;
  schemaVersionId: typeof ABILITY_GRAPH_SCHEMA_VERSION_ID;
  suggestedAction: AbilityGraphImpactAction;
}

export interface AbilityGraphChangeReviewDecision {
  changeId: string;
  decidedAt: string;
  draftVersion: string;
  reviewer: string;
}

export interface AbilityGraphImpactDecision {
  action: AbilityGraphImpactAction;
  decidedAt: string;
  draftVersion: string;
  referenceId: string;
  reviewer: string;
}

export interface AbilityGraphFieldChange {
  after: string;
  before: string;
  field: string;
  label: string;
}

export interface AbilityGraphChange {
  afterSummary: string;
  beforeSummary: string;
  changedFields: AbilityGraphFieldChange[];
  code: string;
  entityId: string;
  entityKind: AbilityGraphChangeEntityKind;
  id: string;
  kind: AbilityGraphChangeKind;
  label: string;
}

export interface AbilityGraphImpact {
  id: string;
  label: string;
  module: AbilityGraphDownstreamModule;
  objectCode: string;
  reasons: string[];
  referenceId: string;
  severity: 'high' | 'medium';
  suggestedAction: AbilityGraphImpactAction;
}

export interface AbilityGraphVersion {
  baseVersion?: string;
  name: string;
  status: 'published' | 'draft';
}

export interface AbilityGraphState {
  changeReviews: AbilityGraphChangeReviewDecision[];
  downstreamReferences: AbilityGraphDownstreamReference[];
  edges: AbilityGraphEdge[];
  impactDecisions: AbilityGraphImpactDecision[];
  nodes: AbilityGraphNode[];
  publishedSnapshots: AbilityGraphPublishedSnapshot[];
  schemaVersionId: typeof ABILITY_GRAPH_SCHEMA_VERSION_ID;
  version: AbilityGraphVersion;
}

export interface AbilityGraphRelationEndpoint {
  sourceType: AbilityGraphNodeType;
  targetType: AbilityGraphNodeType;
}

export interface AbilityGraphRelationDefinition {
  description: string;
  endpoints: AbilityGraphRelationEndpoint[];
  label: string;
  relation: AbilityGraphRelationType;
  sourceTypes: AbilityGraphNodeType[];
  targetTypes: AbilityGraphNodeType[];
}

export interface AbilityGraphValidationIssue {
  code:
    | 'duplicate-edge'
    | 'invalid-source-type'
    | 'invalid-target-type'
    | 'mismatched-source-node-version'
    | 'mismatched-target-node-version'
    | 'missing-capability-mapping'
    | 'missing-node'
    | 'missing-source'
    | 'self-edge'
    | 'unexpected-capability-mapping'
    | 'unknown-capability-behavior';
  message: string;
}

export interface CourseOutcomeAlignment {
  accreditationPathComplete: boolean;
  assessmentTasks: AbilityGraphNode[];
  assessmentPathComplete: boolean;
  capabilityPathComplete: boolean;
  capabilityTargets: AbilityGraphNode[];
  courseOutcome: AbilityGraphNode;
  directCriteria: AbilityGraphNode[];
  experiments: AbilityGraphNode[];
  status: 'ready' | 'review' | 'blocked';
  supportTargets: AbilityGraphNode[];
}

export interface AbilityGraphPublishCheck {
  confirmOnPublish?: boolean;
  detail: string;
  id: string;
  label: string;
  status: 'pass' | 'blocked' | 'warning';
}

export interface AbilityGraphQualityMetric {
  current: number;
  key:
    | 'outcome-support'
    | 'teaching-coverage'
    | 'assessment-coverage'
    | 'capability-closure';
  label: string;
  percent: number;
  total: number;
}

export const abilityGraphNodeTypeLabels: Record<
  AbilityGraphNodeType,
  string
> = {
  'graduate-outcome': '毕业要求',
  'performance-indicator': '指标点',
  course: '课程',
  'course-outcome': '课程目标',
  ability: '能力',
  skill: '技能',
  knowledge: '知识点',
  experiment: '实验项目',
  'teaching-resource': '教学资源',
  'assessment-task': '考核任务',
  'rubric-criterion': '评分项',
};

export const abilityGraphCapabilityLevelLabels: Record<
  AbilityGraphCapabilityLevel,
  string
> = {
  understand: '理解',
  apply: '应用',
  analyze: '分析',
  evaluate: '评价',
  create: '创造',
};
