import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import type { AttainmentEvaluationSummary } from '../../../entities/attainment-evaluation';
import { useEvaluationReviewDrafts } from './useEvaluationReviewDrafts';

const legacyStorageKey =
  'engineering-accreditation.m6-review-drafts.v1';
const storageKey = 'engineering-accreditation.m6-review-drafts.v2';
const evaluations: AttainmentEvaluationSummary[] = [
  {
    abilityCode: 'BA-5',
    abilityName: '工程规范与职业伦理',
    approvalStatus: 'pending',
    course: '计算机网络',
    id: 'evaluation-ct6',
    objectiveCode: 'CT-6',
    objectiveName: '工程规范与伦理',
    outcome: 'not-achieved',
    presentedRunId: 'eval-2026-071',
    readinessStatus: 'ready',
    score: 0.68,
    status: 'not-achieved',
  },
];

beforeEach(() => {
  window.localStorage.clear();
});

describe('useEvaluationReviewDrafts', () => {
  it('isolates drafts by immutable run ID', () => {
    const { result } = renderHook(() =>
      useEvaluationReviewDrafts(evaluations),
    );

    act(() => {
      result.current.setNote('eval-2026-071', '基线复核');
      result.current.setNote('eval-2026-072', '复评复核');
    });

    expect(result.current.getDraft('eval-2026-071').note).toBe(
      '基线复核',
    );
    expect(result.current.getDraft('eval-2026-072').note).toBe(
      '复评复核',
    );
  });

  it('migrates one legacy object draft only to its presented run', async () => {
    window.localStorage.setItem(
      legacyStorageKey,
      JSON.stringify({
        'evaluation-ct6': {
          decision: 'confirm',
          note: '旧对象级草稿',
        },
      }),
    );

    const { result } = renderHook(() =>
      useEvaluationReviewDrafts(evaluations),
    );

    await waitFor(() => {
      expect(result.current.getDraft('eval-2026-071').note).toBe(
        '旧对象级草稿',
      );
    });
    expect(result.current.getDraft('eval-2026-072').note).toBe('');
    expect(window.localStorage.getItem(legacyStorageKey)).toBeNull();
  });

  it('does not overwrite an existing run draft during migration', async () => {
    window.localStorage.setItem(
      legacyStorageKey,
      JSON.stringify({
        'evaluation-ct6': {
          decision: 'recalculate',
          note: '不应覆盖',
        },
      }),
    );
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        'eval-2026-071': {
          decision: 'confirm',
          note: '运行级草稿优先',
        },
      }),
    );

    const { result } = renderHook(() =>
      useEvaluationReviewDrafts(evaluations),
    );

    await waitFor(() => {
      expect(result.current.getDraft('eval-2026-071')).toEqual({
        decision: 'confirm',
        note: '运行级草稿优先',
      });
    });
    expect(window.localStorage.getItem(legacyStorageKey)).toBeNull();
  });
});
