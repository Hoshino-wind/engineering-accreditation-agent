import { describe, expect, it } from 'vitest';

import {
  ABILITY_GRAPH_SCHEMA_VERSION_ID,
  canPublishAbilityGraph,
  getAbilityGraphPublishChecks,
  getAbilityGraphQualityMetrics,
  getCourseOutcomeAlignments,
  validateAbilityGraphEdge,
  type AbilityGraphEdge,
} from './abilityGraph';
import { getAbilityGraphCapabilityProfiles } from './abilityGraphCapability';
import {
  getAbilityGraphChanges,
  getAbilityGraphImpacts,
} from './abilityGraphVersioning';
import { prototypeOnlyAbilityGraph } from './prototypeOnlyAbilityGraph';

function getEdge(id: string) {
  return prototypeOnlyAbilityGraph.edges.find((edge) => edge.id === id)!;
}

function getNodeVersionId(id: string) {
  return prototypeOnlyAbilityGraph.nodes.find((node) => node.id === id)!
    .nodeVersionId;
}

describe('abilityGraph', () => {
  it('使用前后端唯一的当前 Schema 版本', () => {
    expect(prototypeOnlyAbilityGraph.schemaVersionId).toBe(
      ABILITY_GRAPH_SCHEMA_VERSION_ID,
    );
    expect(ABILITY_GRAPH_SCHEMA_VERSION_ID).toBe(
      'teaching-graph-schema@2',
    );
  });

  it('只把同时具备培养能力、语义评价和数值归集的路径判定为完整', () => {
    const alignments = getCourseOutcomeAlignments(
      prototypeOnlyAbilityGraph,
    );

    expect(alignments).toHaveLength(2);
    expect(alignments[0]?.courseOutcome.code).toBe('CO-DS-3');
    expect(alignments[0]?.experiments).toHaveLength(1);
    expect(alignments[0]?.capabilityTargets.length).toBeGreaterThan(0);
    expect(alignments[0]?.directCriteria).toHaveLength(2);
    expect(alignments[0]?.status).toBe('ready');
    expect(alignments[1]?.courseOutcome.code).toBe('CO-DS-4');
    expect(alignments[1]?.directCriteria).toHaveLength(0);
    expect(alignments[1]?.status).toBe('blocked');
  });

  it('质量指标只基于正式映射，不读取 M6 评价运行快照', () => {
    const metrics = getAbilityGraphQualityMetrics(
      prototypeOnlyAbilityGraph,
    );

    expect(metrics).toEqual([
      expect.objectContaining({
        key: 'outcome-support',
        percent: 100,
      }),
      expect.objectContaining({
        key: 'teaching-coverage',
        percent: 100,
      }),
      expect.objectContaining({
        key: 'assessment-coverage',
        percent: 50,
      }),
      expect.objectContaining({
        key: 'capability-closure',
        percent: 50,
      }),
    ]);
    expect('evidenceSnapshots' in prototypeOnlyAbilityGraph).toBe(false);
  });

  it('拒绝 relation type 与精确端点组合不匹配的关系', () => {
    const template = getEdge('edge-skill-design-requires-tree');
    const invalidEdge: AbilityGraphEdge = {
      ...template,
      id: 'invalid-edge',
      edgeVersionId: 'edge-version:invalid-edge:v1',
      sourceId: 'ability-problem-analysis',
      sourceNodeVersionId: getNodeVersionId(
        'ability-problem-analysis',
      ),
      targetId: 'knowledge-tree-traversal',
      targetNodeVersionId: getNodeVersionId(
        'knowledge-tree-traversal',
      ),
    };

    const issues = validateAbilityGraphEdge(
      prototypeOnlyAbilityGraph,
      invalidEdge,
    );

    expect(issues.map((issue) => issue.code)).toContain(
      'invalid-source-type',
    );
  });

  it('区分评分项评价语义与课程目标归集路径', () => {
    const semanticEdge = getEdge(
      'edge-correctness-assesses-design',
    );
    expect(
      validateAbilityGraphEdge(
        prototypeOnlyAbilityGraph,
        semanticEdge,
      ),
    ).toEqual([]);

    const contributionEdge = getEdge(
      'edge-correctness-contributes-co3',
    );
    expect(
      validateAbilityGraphEdge(
        prototypeOnlyAbilityGraph,
        contributionEdge,
      ),
    ).toEqual([]);
    expect(
      validateAbilityGraphEdge(prototypeOnlyAbilityGraph, {
        ...semanticEdge,
        id: 'edge-assesses-course-outcome',
        edgeVersionId:
          'edge-version:edge-assesses-course-outcome:v1',
        targetId: 'course-outcome-ds-3',
        targetNodeVersionId: getNodeVersionId('course-outcome-ds-3'),
      }).map((issue) => issue.code),
    ).toContain('invalid-target-type');
  });

  it('关系端点必须绑定当前节点版本', () => {
    const edge = getEdge('edge-exp5-contributes-co3');
    const issues = validateAbilityGraphEdge(prototypeOnlyAbilityGraph, {
      ...edge,
      sourceNodeVersionId: 'node-version:experiment-tree:stale',
    });

    expect(issues.map((issue) => issue.code)).toContain(
      'mismatched-source-node-version',
    );
  });

  it('从正式 Ability 节点推导认证要求、培养承载和评分闭环', () => {
    const profiles = getAbilityGraphCapabilityProfiles(
      prototypeOnlyAbilityGraph,
    );

    expect(profiles).toHaveLength(1);
    expect(profiles[0]).toEqual(
      expect.objectContaining({
        behaviorCoveragePercent: 100,
        closedLoopCount: 1,
        status: 'assessment-gap',
      }),
    );
    expect(profiles[0]?.capability).toEqual(
      expect.objectContaining({
        code: 'BA-2',
        type: 'ability',
      }),
    );
    expect(profiles[0]?.performanceIndicators.map((node) => node.code)).toEqual(
      ['PI-2.1'],
    );
    expect(profiles[0]?.paths.map((path) => path.status)).toEqual([
      'closed-loop',
      'assessment-gap',
    ]);
  });

  it('课程目标支撑指标点时必须映射其所要求能力的可观察行为', () => {
    const supportEdge = getEdge('edge-co3-supports-pi21');
    const issues = validateAbilityGraphEdge(prototypeOnlyAbilityGraph, {
      ...supportEdge,
      id: 'edge-support-without-semantics',
      edgeVersionId:
        'edge-version:edge-support-without-semantics:v1',
      capabilityMapping: undefined,
    });

    expect(issues.map((issue) => issue.code)).toContain(
      'missing-capability-mapping',
    );

    const expectationEdge = getEdge('edge-pi21-expects-ba2');
    expect(
      validateAbilityGraphEdge(prototypeOnlyAbilityGraph, {
        ...expectationEdge,
        id: 'edge-expectation-with-unexpected-mapping',
        edgeVersionId:
          'edge-version:edge-expectation-with-unexpected-mapping:v1',
        capabilityMapping: supportEdge.capabilityMapping,
      }).map((issue) => issue.code),
    ).toContain('unexpected-capability-mapping');
  });

  it('能力行为映射缺失时不把课程目标计入产出能力覆盖', () => {
    const graphWithoutMapping = {
      ...prototypeOnlyAbilityGraph,
      edges: prototypeOnlyAbilityGraph.edges.map((edge) =>
        edge.id === 'edge-co3-supports-pi21'
          ? { ...edge, capabilityMapping: undefined }
          : edge,
      ),
    };

    expect(
      getAbilityGraphQualityMetrics(graphWithoutMapping).find(
        (metric) => metric.key === 'outcome-support',
      ),
    ).toEqual(expect.objectContaining({ current: 1, percent: 50 }));
    expect(
      getAbilityGraphPublishChecks(graphWithoutMapping).find(
        (check) => check.id === 'support',
      ),
    ).toEqual(expect.objectContaining({ status: 'blocked' }));
  });

  it('结构、逐项审核和影响处置缺口都会阻断发布', () => {
    const blockedChecks = getAbilityGraphPublishChecks(
      prototypeOnlyAbilityGraph,
    );

    expect(canPublishAbilityGraph(blockedChecks)).toBe(false);
    expect(
      blockedChecks.find((check) => check.id === 'assessment'),
    ).toEqual(expect.objectContaining({ status: 'blocked' }));
    expect(blockedChecks.find((check) => check.id === 'review')).toEqual(
      expect.objectContaining({ status: 'blocked' }),
    );

    const completedGraph = {
      ...prototypeOnlyAbilityGraph,
      edges: [
        ...prototypeOnlyAbilityGraph.edges,
        {
          ...getEdge('edge-performance-assesses-ba2'),
          id: 'edge-performance-contributes-co4',
          edgeVersionId:
            'edge-version:edge-performance-contributes-co4:v1',
          relation: 'contributes-to' as const,
          sourceId: 'criterion-performance-argument',
          sourceNodeVersionId: getNodeVersionId(
            'criterion-performance-argument',
          ),
          targetId: 'course-outcome-ds-4',
          targetNodeVersionId: getNodeVersionId('course-outcome-ds-4'),
          source: {
            sourceRefId: 'source-ref:edge-performance-co4',
            materialId: 'material:ds-evaluation-plan',
            materialVersionId:
              'material-version:ds-evaluation-plan:v1.2',
            evidenceFragmentId:
              'evidence-fragment:edge-performance-co4',
            material: '数据结构课程目标评价说明',
            version: 'v1.2',
            coordinate: '表 4 · CO-DS-4 输入 1',
          },
        },
      ],
    };

    const completedChanges = getAbilityGraphChanges(completedGraph);
    const completedImpacts = getAbilityGraphImpacts(
      completedGraph,
      completedChanges,
    );
    const governedGraph = {
      ...completedGraph,
      changeReviews: completedChanges.map((change) => ({
        changeId: change.id,
        draftVersion: completedGraph.version.name,
        reviewer: '王老师',
        decidedAt: '2026-07-29T10:00:00+08:00',
      })),
      impactDecisions: completedImpacts.map((impact) => ({
        referenceId: impact.referenceId,
        draftVersion: completedGraph.version.name,
        reviewer: '王老师',
        decidedAt: '2026-07-29T10:05:00+08:00',
        action: impact.suggestedAction,
      })),
    };

    expect(
      canPublishAbilityGraph(getAbilityGraphPublishChecks(governedGraph)),
    ).toBe(true);
  });
});
