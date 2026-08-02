import { describe, expect, it } from 'vitest';

import type { AttainmentEvaluationObjectList } from '../../../entities/attainment-evaluation';
import { resolveSupportBlockerTarget } from './useSupportBlockerTarget';

const evaluationObjects: AttainmentEvaluationObjectList = {
  items: [
    {
      abilityCode: 'CT-6',
      abilityName: '工程问题分析',
      approvalStatus: 'pending',
      course: '软件工程综合实践',
      id: 'evaluation-ct6',
      objectiveCode: 'CO-4',
      objectiveName: '复杂工程问题分析',
      outcome: 'not-achieved',
      presentedRunId: 'eval-2026-071',
      readinessStatus: 'ready',
      score: 0.68,
      status: 'not-achieved',
    },
  ],
  total: 1,
};

type ResolveOptions = Parameters<
  typeof resolveSupportBlockerTarget
>[0];

function resolve(
  overrides: Partial<ResolveOptions> = {},
) {
  return resolveSupportBlockerTarget({
    evaluationObjects,
    evaluationObjectsStatus: 'success',
    evaluationReference: {
      evaluationObjectId: 'evaluation-ct6',
      runId: 'eval-2026-071',
    },
    evaluationReferenceStatus: 'success',
    module: 'M6',
    sourceObjectId: 'eval-2026-071',
    ...overrides,
  });
}

describe('resolveSupportBlockerTarget', () => {
  it('resolves a module route when no source object is provided', () => {
    expect(resolve({ sourceObjectId: undefined })).toEqual({
      kind: 'module',
      route: '/evaluations',
    });
  });

  it('resolves an exact M7 case and trims its case ID', () => {
    expect(
      resolve({
        module: 'M7',
        sourceObjectId: ' qi-2026-017 ',
      }),
    ).toEqual({
      kind: 'exact',
      route: '/improvements?case=qi-2026-017',
    });
  });

  it('keeps supported non-M6 modules at module level', () => {
    expect(
      resolve({ module: 'M2', sourceObjectId: 'graph-node-1' }),
    ).toEqual({ kind: 'module', route: '/graph' });
  });

  it('returns unsupported when the module has no route', () => {
    expect(
      resolve({ module: 'M1' as ResolveOptions['module'] }),
    ).toEqual({
      kind: 'unsupported',
    });
  });

  it.each([
    ['evaluation reference', 'pending', 'success'],
    ['evaluation object list', 'success', 'pending'],
  ] as const)(
    'keeps a module target while the %s is pending',
    (_, evaluationReferenceStatus, evaluationObjectsStatus) => {
      expect(
        resolve({
          evaluationObjectsStatus,
          evaluationReferenceStatus,
        }),
      ).toEqual({ kind: 'module', route: '/evaluations' });
    },
  );

  it.each([
    ['evaluation reference', 'error', 'success'],
    ['evaluation object list', 'success', 'error'],
  ] as const)(
    'uses the service fallback when the %s fails',
    (_, evaluationReferenceStatus, evaluationObjectsStatus) => {
      expect(
        resolve({
          evaluationObjectsStatus,
          evaluationReferenceStatus,
        }),
      ).toEqual({
        kind: 'service-unavailable',
        route: '/evaluations',
      });
    },
  );

  it('uses the not-found fallback for an unknown run', () => {
    expect(resolve({ evaluationReference: null })).toEqual({
      kind: 'not-found',
      route: '/evaluations',
    });
  });

  it('rejects a reference to an object outside the current list', () => {
    expect(
      resolve({
        evaluationReference: {
          evaluationObjectId: 'evaluation-not-loaded',
          runId: 'eval-2026-072',
        },
      }),
    ).toEqual({
      kind: 'object-unavailable',
      route: '/evaluations',
    });
  });

  it('resolves an exact historical run for an available object', () => {
    expect(
      resolve({
        evaluationReference: {
          evaluationObjectId: 'evaluation-ct6',
          runId: 'eval-2026-072',
        },
      }),
    ).toEqual({
      kind: 'exact',
      route: '/evaluations?evaluation=evaluation-ct6&run=eval-2026-072',
    });
  });

  it('resolves the exact object and presented run', () => {
    expect(resolve()).toEqual({
      kind: 'exact',
      route: '/evaluations?evaluation=evaluation-ct6&run=eval-2026-071',
    });
  });
});
