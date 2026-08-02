import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiGetMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
}));

vi.mock('../../../shared/api/client', () => ({
  apiClient: {
    GET: apiGetMock,
  },
}));

import { getAttainmentEvaluationObjects } from './getAttainmentEvaluationObjects';

const readySummary = {
  abilityCode: 'BA-5',
  abilityName: '工程规范与职业伦理',
  approvalStatus: 'pending' as const,
  course: '计算机网络',
  evaluationObjectId: 'evaluation-ct6',
  objectiveCode: 'CT-6',
  objectiveName: '工程规范与伦理',
  presentedRunId: 'eval-2026-071',
  readinessStatus: 'ready' as const,
  result: {
    outcome: 'not_achieved' as const,
    score: 0.68,
  },
};

beforeEach(() => {
  apiGetMock.mockReset();
});

describe('getAttainmentEvaluationObjects', () => {
  it('uses the generated list path and maps independent status axes', async () => {
    apiGetMock.mockResolvedValue({
      data: {
        items: [readySummary],
        total: 1,
      },
      response: new Response(null, { status: 200 }),
    });

    await expect(getAttainmentEvaluationObjects()).resolves.toEqual({
      items: [
        expect.objectContaining({
          approvalStatus: 'pending',
          id: 'evaluation-ct6',
          outcome: 'not-achieved',
          presentedRunId: 'eval-2026-071',
          readinessStatus: 'ready',
          score: 0.68,
          status: 'not-achieved',
        }),
      ],
      total: 1,
    });
    expect(apiGetMock).toHaveBeenCalledWith(
      '/api/v1/evaluations/objects',
    );
  });

  it('keeps a valid empty list distinct from service failure', async () => {
    apiGetMock.mockResolvedValue({
      data: { items: [], total: 0 },
      response: new Response(null, { status: 200 }),
    });

    await expect(getAttainmentEvaluationObjects()).resolves.toEqual({
      items: [],
      total: 0,
    });
  });

  it.each([
    {
      data: { items: [readySummary], total: 2 },
      name: 'inconsistent total',
    },
    {
      data: {
        items: [readySummary, readySummary],
        total: 2,
      },
      name: 'duplicate identity',
    },
    {
      error: { detail: 'service unavailable' },
      name: 'service error',
    },
  ])('rejects $name instead of reviving prototype data', async (result) => {
    apiGetMock.mockResolvedValue({
      ...result,
      response: new Response(null, { status: 503 }),
    });

    await expect(
      getAttainmentEvaluationObjects(),
    ).rejects.toThrow('评价对象读取服务不可用');
  });
});
