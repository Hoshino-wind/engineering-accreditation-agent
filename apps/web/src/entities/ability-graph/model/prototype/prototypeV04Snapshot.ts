import {
  ABILITY_GRAPH_SCHEMA_VERSION_ID,
  type AbilityGraphPublishedSnapshot,
} from '../abilityGraph';
import { currentPrototypeEdges } from './prototypeEdges';
import { currentPrototypeNodes } from './prototypeNodes';
import { prototypeSource as source } from './prototypeSource';

const v04ExcludedNodeIds = new Set([
  'experiment-comparison',
  'assessment-task-comparison-report',
  'criterion-performance-argument',
]);

const v04ExcludedEdgeIds = new Set([
  'edge-co4-supports-pi21',
  'edge-exp6-belongs-course',
  'edge-exp6-contributes-co4',
  'edge-exp6-cultivates-ba2',
  'edge-exp6-trains-performance',
  'edge-exp6-covers-complexity',
  'edge-exp6-uses-performance-resource',
  'edge-exp6-contains-task6',
  'edge-task6-contains-performance',
  'edge-performance-assesses-ba2',
]);

const v04Nodes = currentPrototypeNodes
  .filter((node) => !v04ExcludedNodeIds.has(node.id))
  .map((node) =>
    node.id === 'course-outcome-ds-4'
      ? {
          ...node,
          nodeVersionId: 'node-version:course-outcome-ds-4:v2',
          name: '算法复杂度分析',
          definition: '能够分析典型算法的时间复杂度与空间复杂度。',
          status: 'effective' as const,
          version: 'v2.0',
          source: source(
            'co-ds-4-v2',
            'material:ds-syllabus',
            'material-version:ds-syllabus:v2',
            '《数据结构》课程教学大纲',
            'v2',
            '第 6 页 · 课程目标 4',
          ),
        }
      : {
          ...node,
          status: 'effective' as const,
          source: { ...node.source },
        },
  );

const v04NodeVersionById = new Map(
  v04Nodes.map((node) => [node.id, node.nodeVersionId]),
);

const v04Edges = currentPrototypeEdges
  .filter((candidate) => !v04ExcludedEdgeIds.has(candidate.id))
  .map((candidate) => ({
    ...candidate,
    edgeVersionId:
      candidate.id === 'edge-course-defines-co4'
        ? 'edge-version:edge-course-defines-co4:v1'
        : candidate.edgeVersionId,
    sourceNodeVersionId:
      v04NodeVersionById.get(candidate.sourceId) ??
      candidate.sourceNodeVersionId,
    targetNodeVersionId:
      v04NodeVersionById.get(candidate.targetId) ??
      candidate.targetNodeVersionId,
    status: 'effective' as const,
    reviewStatus: 'approved' as const,
    source:
      candidate.id === 'edge-course-defines-co4'
        ? source(
            'edge-course-co4-v2',
            'material:ds-syllabus',
            'material-version:ds-syllabus:v2',
            '《数据结构》课程教学大纲',
            'v2',
            '第 6 页 · 课程目标 4',
          )
        : { ...candidate.source },
  }));

export const prototypeV04PublishedSnapshot: AbilityGraphPublishedSnapshot = {
  version: 'v0.4',
  schemaVersionId: ABILITY_GRAPH_SCHEMA_VERSION_ID,
  publishedAt: '2025-06-30T09:00:00+08:00',
  nodes: v04Nodes,
  edges: v04Edges,
};

