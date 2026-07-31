import {
  ABILITY_GRAPH_SCHEMA_VERSION_ID,
  type AbilityGraphDownstreamReference,
} from '../abilityGraph';

const schemaVersionId = ABILITY_GRAPH_SCHEMA_VERSION_ID;

export const prototypeDownstreamReferences: AbilityGraphDownstreamReference[] = [
  {
    id: 'evaluation-run-co4-2024',
    module: 'M6',
    objectCode: 'EVAL-DS-2024-CO4',
    label: '2024 秋季《数据结构》CO-DS-4 达成评价',
    graphVersion: 'v0.4',
    schemaVersionId,
    nodeIds: ['course-outcome-ds-4'],
    nodeVersionIds: ['node-version:course-outcome-ds-4:v2'],
    edgeIds: [],
    edgeVersionIds: [],
    suggestedAction: 'recalculate',
  },
  {
    id: 'diagnostic-finding-ds-104',
    module: 'M5',
    objectCode: 'D-104',
    label: '数据结构课程目标覆盖诊断',
    graphVersion: 'v0.4',
    schemaVersionId,
    nodeIds: ['course-outcome-ds-4'],
    nodeVersionIds: ['node-version:course-outcome-ds-4:v2'],
    edgeIds: [],
    edgeVersionIds: [],
    suggestedAction: 'recheck',
  },
  {
    id: 'support-package-gr2-2025',
    module: 'M8',
    objectCode: 'PKG-GR2-2025',
    label: '2025 工程认证支撑包 · 毕业要求 2',
    graphVersion: 'v0.4',
    schemaVersionId,
    nodeIds: [
      'performance-indicator-2-1',
      'course-outcome-ds-4',
    ],
    nodeVersionIds: [
      'node-version:performance-indicator-2-1:v1',
      'node-version:course-outcome-ds-4:v2',
    ],
    edgeIds: [],
    edgeVersionIds: [],
    suggestedAction: 'refresh',
  },
];
