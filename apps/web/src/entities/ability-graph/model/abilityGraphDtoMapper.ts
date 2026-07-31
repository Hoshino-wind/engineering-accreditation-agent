import type { components } from '@engineering-accreditation/api-client';

import type {
  AbilityGraphEdge,
  AbilityGraphNode,
  AbilityGraphState,
} from './abilityGraph';

type GraphWorkspaceDto = components['schemas']['GraphWorkspaceResponse'];
type GraphNodeDto = components['schemas']['GraphNodeContract'];
type GraphEdgeDto = components['schemas']['GraphEdgeContract'];

export interface AbilityGraphWorkspace {
  graph: AbilityGraphState;
  revision: number;
  updatedAt: string;
  updatedBy: string;
}

function mapNodeDto(node: GraphNodeDto): AbilityGraphNode {
  return {
    code: node.code,
    definition: node.definition,
    id: node.id,
    name: node.name,
    nodeVersionId: node.nodeVersionId,
    owner: node.owner,
    source: { ...node.source },
    status: node.status,
    type: node.type,
    version: node.version,
    ...(node.capability
      ? {
          capability: {
            ...node.capability,
            observableBehaviors: [
              ...node.capability.observableBehaviors,
            ],
          },
        }
      : {}),
  };
}

function mapEdgeDto(edge: GraphEdgeDto): AbilityGraphEdge {
  return {
    edgeVersionId: edge.edgeVersionId,
    effectiveCycle: edge.effectiveCycle,
    id: edge.id,
    relation: edge.relation,
    reviewStatus: edge.reviewStatus,
    source: { ...edge.source },
    sourceId: edge.sourceId,
    sourceNodeVersionId: edge.sourceNodeVersionId,
    status: edge.status,
    targetId: edge.targetId,
    targetNodeVersionId: edge.targetNodeVersionId,
    ...(edge.capabilityMapping
      ? {
          capabilityMapping: {
            ...edge.capabilityMapping,
            targetBehaviors: [
              ...edge.capabilityMapping.targetBehaviors,
            ],
          },
        }
      : {}),
  };
}

export function mapAbilityGraphWorkspaceDto(
  dto: GraphWorkspaceDto,
): AbilityGraphWorkspace {
  return {
    graph: {
      ...dto.state,
      edges: dto.state.edges.map(mapEdgeDto),
      nodes: dto.state.nodes.map(mapNodeDto),
      publishedSnapshots: dto.state.publishedSnapshots.map((snapshot) => ({
        ...snapshot,
        edges: snapshot.edges.map(mapEdgeDto),
        nodes: snapshot.nodes.map(mapNodeDto),
      })),
      version: {
        name: dto.state.version.name,
        status: dto.state.version.status,
        ...(dto.state.version.baseVersion
          ? { baseVersion: dto.state.version.baseVersion }
          : {}),
      },
    },
    revision: dto.revision,
    updatedAt: dto.updatedAt,
    updatedBy: dto.updatedBy,
  };
}
