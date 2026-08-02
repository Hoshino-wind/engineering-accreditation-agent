import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiGetMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
}));

vi.mock('../../../shared/api/client', () => ({
  apiClient: {
    GET: apiGetMock,
  },
}));

import { getAttainmentEvaluationRunReference } from './getAttainmentEvaluationRunReference';

beforeEach(() => {
  apiGetMock.mockReset();
});

describe('getAttainmentEvaluationRunReference', () => {
  it('uses the generated path contract and maps a known reference', async () => {
    apiGetMock.mockResolvedValue({
      data: {
        evaluationObjectId: 'evaluation-ct6',
        runId: '  eval-2026-071  ',
      },
      response: new Response(null, { status: 200 }),
    });

    await expect(
      getAttainmentEvaluationRunReference('  eval-2026-071  '),
    ).resolves.toEqual({
      evaluationObjectId: 'evaluation-ct6',
      runId: '  eval-2026-071  ',
    });
    expect(apiGetMock).toHaveBeenCalledWith(
      '/api/v1/evaluations/runs/{run_id}/reference',
      {
        params: {
          path: {
            run_id: '  eval-2026-071  ',
          },
        },
      },
    );
  });

  it('maps a contract 404 to an unknown reference', async () => {
    apiGetMock.mockResolvedValue({
      error: {
        detail: {
          code: 'evaluation_run_not_found',
          message: '未找到指定评价运行',
          runId: 'eval-unknown',
        },
      },
      response: new Response(null, { status: 404 }),
    });

    await expect(
      getAttainmentEvaluationRunReference('eval-unknown'),
    ).resolves.toBeNull();
  });

  it('keeps service failures distinct from an unknown reference', async () => {
    apiGetMock.mockResolvedValue({
      error: { detail: 'service unavailable' },
      response: new Response(null, { status: 503 }),
    });

    await expect(
      getAttainmentEvaluationRunReference('eval-2026-071'),
    ).rejects.toThrow('评价运行定位服务不可用');
  });

  it('rejects an unrelated 404 instead of reporting an unknown run', async () => {
    apiGetMock.mockResolvedValue({
      error: {
        detail: {
          code: 'route_not_found',
          message: 'Not Found',
          runId: 'eval-2026-071',
        },
      },
      response: new Response(null, { status: 404 }),
    });

    await expect(
      getAttainmentEvaluationRunReference('eval-2026-071'),
    ).rejects.toThrow('评价运行定位服务不可用');
  });

  it('rejects a response bound to a different run ID', async () => {
    apiGetMock.mockResolvedValue({
      data: {
        evaluationObjectId: 'evaluation-ct6',
        runId: 'eval-2026-072',
      },
      response: new Response(null, { status: 200 }),
    });

    await expect(
      getAttainmentEvaluationRunReference('eval-2026-071'),
    ).rejects.toThrow('评价运行定位服务不可用');
  });

  it('maps a rejected network request to a service failure', async () => {
    apiGetMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(
      getAttainmentEvaluationRunReference('eval-2026-071'),
    ).rejects.toThrow('评价运行定位服务不可用');
  });
});
