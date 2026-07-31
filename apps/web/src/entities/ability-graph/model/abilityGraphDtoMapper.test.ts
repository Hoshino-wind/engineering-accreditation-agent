import type { components } from '@engineering-accreditation/api-client';
import { describe, expect, it } from 'vitest';

import { prototypeOnlyAbilityGraph } from './prototypeOnlyAbilityGraph';
import { mapAbilityGraphWorkspaceDto } from './abilityGraphDtoMapper';

type GraphWorkspaceDto = components['schemas']['GraphWorkspaceResponse'];

describe('mapAbilityGraphWorkspaceDto', () => {
  it('把 camelCase 生成契约映射为不含 null 且保留稳定版本 ID 的领域状态', () => {
    const dto: GraphWorkspaceDto = {
      revision: 7,
      state: {
        ...prototypeOnlyAbilityGraph,
        nodes: prototypeOnlyAbilityGraph.nodes.map((node) => ({
          ...node,
          capability: node.capability ?? null,
        })),
        edges: prototypeOnlyAbilityGraph.edges.map((edge) => ({
          ...edge,
          capabilityMapping: edge.capabilityMapping ?? null,
        })),
        publishedSnapshots:
          prototypeOnlyAbilityGraph.publishedSnapshots.map((snapshot) => ({
            ...snapshot,
            nodes: snapshot.nodes.map((node) => ({
              ...node,
              capability: node.capability ?? null,
            })),
            edges: snapshot.edges.map((edge) => ({
              ...edge,
              capabilityMapping: edge.capabilityMapping ?? null,
            })),
          })),
        version: {
          ...prototypeOnlyAbilityGraph.version,
          baseVersion:
            prototypeOnlyAbilityGraph.version.baseVersion ?? null,
        },
      },
      updatedAt: '2026-07-29T12:00:00Z',
      updatedBy: '王老师',
    };

    const workspace = mapAbilityGraphWorkspaceDto(dto);

    expect(workspace.revision).toBe(7);
    expect(workspace.graph.version.baseVersion).toBe('v0.4');
    expect(workspace.graph.schemaVersionId).toBe(
      prototypeOnlyAbilityGraph.schemaVersionId,
    );
    expect(workspace.graph.nodes[0]?.capability).toBeUndefined();
    expect(workspace.graph.nodes[0]?.nodeVersionId).toBe(
      prototypeOnlyAbilityGraph.nodes[0]?.nodeVersionId,
    );
    expect(workspace.graph.edges[0]?.edgeVersionId).toBe(
      prototypeOnlyAbilityGraph.edges[0]?.edgeVersionId,
    );
  });
});
