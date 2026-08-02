import { beforeEach, describe, expect, it, vi } from 'vitest';

import { attainmentEvaluationPreflightFixtures } from '../testing/attainmentEvaluationPreflightFixtures';

const { apiGetMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
}));

vi.mock('../../../shared/api/client', () => ({
  apiClient: {
    GET: apiGetMock,
  },
}));

import { getAttainmentEvaluationPreflight } from './getAttainmentEvaluationPreflight';

beforeEach(() => {
  apiGetMock.mockReset();
});

describe('getAttainmentEvaluationPreflight', () => {
  it('requests and maps the exact opaque run ID without trimming it', async () => {
    const report = {
      ...attainmentEvaluationPreflightFixtures['eval-2026-068']!,
      runId: '  eval-2026-068  ',
    };
    apiGetMock.mockResolvedValue({
      data: report,
      response: new Response(null, { status: 200 }),
    });

    await expect(
      getAttainmentEvaluationPreflight('  eval-2026-068  '),
    ).resolves.toEqual(report);
    expect(apiGetMock).toHaveBeenCalledWith(
      '/api/v1/evaluations/runs/{run_id}/preflight',
      {
        params: {
          path: {
            run_id: '  eval-2026-068  ',
          },
        },
      },
    );
  });

  it('maps only the matching contract 404 to a missing report', async () => {
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
      getAttainmentEvaluationPreflight('eval-unknown'),
    ).resolves.toBeNull();
  });

  it.each([
    {
      data: {
        ...attainmentEvaluationPreflightFixtures['eval-2026-068']!,
        runId: 'eval-2026-070',
      },
      name: 'mismatched response ID',
      status: 200,
    },
    {
      data: {
        ...attainmentEvaluationPreflightFixtures['eval-2026-068']!,
        scope: 'formal_snapshot',
      },
      name: 'unsupported report scope',
      status: 200,
    },
    {
      data: {
        ...attainmentEvaluationPreflightFixtures['eval-2026-068']!,
        reportVersion: 'evaluation-preflight:v2',
      },
      name: 'unsupported report version',
      status: 200,
    },
    {
      error: {
        detail: {
          code: 'route_not_found',
          message: 'Not Found',
          runId: 'eval-2026-068',
        },
      },
      name: 'unrelated 404',
      status: 404,
    },
    {
      error: { detail: 'service unavailable' },
      name: 'service error',
      status: 503,
    },
  ])('rejects $name as a service or contract failure', async (result) => {
    apiGetMock.mockResolvedValue({
      ...result,
      response: new Response(null, { status: result.status }),
    });

    await expect(
      getAttainmentEvaluationPreflight('eval-2026-068'),
    ).rejects.toThrow('评价输入预检服务不可用');
  });

  it('maps a rejected network request to a service failure', async () => {
    apiGetMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(
      getAttainmentEvaluationPreflight('eval-2026-068'),
    ).rejects.toThrow('评价输入预检服务不可用');
  });
});
