import { describe, expect, it } from 'vitest';

import {
  canPublishAbilityGraph,
  getAbilityGraphPublishChecks,
} from './abilityGraph';
import { prototypeOnlyAbilityGraph } from './prototypeOnlyAbilityGraph';
import {
  createAbilityGraphPublishedSnapshot,
  getAbilityGraphBaselineSnapshot,
  getAbilityGraphChanges,
  getAbilityGraphImpacts,
} from './abilityGraphVersioning';

describe('abilityGraphVersioning', () => {
  it('从正式基线计算新增、修改和字段级差异', () => {
    const baseline = getAbilityGraphBaselineSnapshot(
      prototypeOnlyAbilityGraph,
    );
    const changes = getAbilityGraphChanges(prototypeOnlyAbilityGraph);
    const changedCourseOutcome = changes.find(
      (change) => change.id === 'node:course-outcome-ds-4',
    );

    expect(baseline?.version).toBe('v0.4');
    expect(changes.filter((change) => change.kind === 'added').length).toBeGreaterThan(
      0,
    );
    expect(
      changes.filter((change) => change.kind === 'modified'),
    ).toHaveLength(2);
    expect(changedCourseOutcome).toEqual(
      expect.objectContaining({
        code: 'CO-DS-4',
        kind: 'modified',
      }),
    );
    expect(
      changedCourseOutcome?.changedFields.map((field) => field.field),
    ).toEqual(
      expect.arrayContaining([
        'name',
        'definition',
        'nodeVersionId',
        'version',
        'source.sourceRefId',
        'source.materialVersionId',
        'source.version',
      ]),
    );
  });

  it('根据变化对象和关系端点识别 M5、M6、M8 下游影响', () => {
    const impacts = getAbilityGraphImpacts(prototypeOnlyAbilityGraph);

    expect(impacts).toHaveLength(3);
    expect(impacts.map((impact) => impact.module).sort()).toEqual([
      'M5',
      'M6',
      'M8',
    ]);
    expect(
      impacts.find((impact) => impact.module === 'M6'),
    ).toEqual(
      expect.objectContaining({
        severity: 'high',
        suggestedAction: 'recalculate',
      }),
    );
    expect(
      impacts.every((impact) => impact.reasons.length > 0),
    ).toBe(true);
  });

  it('创建正式快照时复制并固化当前有效对象和关系', () => {
    const snapshot = createAbilityGraphPublishedSnapshot(
      prototypeOnlyAbilityGraph,
      '2026-07-29T11:00:00+08:00',
    );

    expect(snapshot.version).toBe('v0.5');
    expect(snapshot.schemaVersionId).toBe(
      prototypeOnlyAbilityGraph.schemaVersionId,
    );
    expect(snapshot.nodes.every((node) => node.status === 'effective')).toBe(
      true,
    );
    expect(
      snapshot.edges.every(
        (edge) =>
          edge.status === 'effective' &&
          edge.reviewStatus === 'approved',
      ),
    ).toBe(true);
    expect(snapshot.nodes).not.toBe(prototypeOnlyAbilityGraph.nodes);
    expect(snapshot.nodes[0]?.source).not.toBe(
      prototypeOnlyAbilityGraph.nodes[0]?.source,
    );
    expect(
      snapshot.edges.every((edge) => {
        const sourceNode = snapshot.nodes.find(
          (node) => node.id === edge.sourceId,
        );
        const targetNode = snapshot.nodes.find(
          (node) => node.id === edge.targetId,
        );
        return (
          edge.sourceNodeVersionId === sourceNode?.nodeVersionId &&
          edge.targetNodeVersionId === targetNode?.nodeVersionId
        );
      }),
    ).toBe(true);
  });

  it('空修订不能发布为新的正式版本', () => {
    const baseline = getAbilityGraphBaselineSnapshot(
      prototypeOnlyAbilityGraph,
    )!;
    const emptyRevision = {
      ...prototypeOnlyAbilityGraph,
      version: {
        name: 'v0.4.1',
        baseVersion: 'v0.4',
        status: 'draft' as const,
      },
      nodes: baseline.nodes,
      edges: baseline.edges,
      changeReviews: [],
      impactDecisions: [],
    };
    const checks = getAbilityGraphPublishChecks(emptyRevision);

    expect(
      checks.find((check) => check.id === 'change-set'),
    ).toEqual(
      expect.objectContaining({
        status: 'blocked',
      }),
    );
    expect(canPublishAbilityGraph(checks)).toBe(false);
  });
});
