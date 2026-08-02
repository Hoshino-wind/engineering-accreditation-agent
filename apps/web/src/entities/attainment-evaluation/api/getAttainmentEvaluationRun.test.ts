import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiGetMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
}));

vi.mock('../../../shared/api/client', () => ({
  apiClient: {
    GET: apiGetMock,
  },
}));

import { getAttainmentEvaluationRun } from './getAttainmentEvaluationRun';

const runDetail = {
  approvalStatus: 'pending' as const,
  calculation: {
    blockers: [],
    contributions: [
      {
        input: {
          evidenceName: '网络工程案例评分表 v1.3',
          id: 'input-standard',
          label: '工程规范应用',
          scoreRate: 0.7,
          weight: 0.6,
        },
        value: 0.42,
      },
    ],
    ready: true,
    result: {
      outcome: 'not_achieved' as const,
      score: 0.68,
    },
    weightTotal: 1,
  },
  evaluationObject: {
    abilityCode: 'BA-5',
    abilityName: '工程规范与职业伦理',
    course: '计算机网络',
    evaluationObjectId: 'evaluation-ct6',
    objectiveCode: 'CT-6',
    objectiveName: '工程规范与伦理',
  },
  evidence: [],
  graphVersion: '图谱 v0.3',
  inputSnapshot: {
    createdAt: '2026-07-26 11:05',
    hash: 'sha256:cd51…641e',
  },
  inputs: [
    {
      evidenceName: '网络工程案例评分表 v1.3',
      id: 'input-standard',
      label: '工程规范应用',
      scoreRate: 0.7,
      weight: 0.6,
    },
  ],
  policyVersion: 'policy v1.2',
  programVersion: 'evaluator 0.8.0',
  readinessChecks: [
    {
      detail: '关系、权重、评分和异常校验均通过',
      id: 'ready',
      label: '全部输入就绪',
      status: 'pass' as const,
    },
  ],
  runId: 'eval-2026-071',
  scoreSnapshot: '2026-07-26',
  studentCount: 40,
  threshold: 0.7,
};

beforeEach(() => {
  apiGetMock.mockReset();
});

describe('getAttainmentEvaluationRun', () => {
  it('maps one exact run without recalculating its server result', async () => {
    apiGetMock.mockResolvedValue({
      data: runDetail,
      response: new Response(null, { status: 200 }),
    });

    const result = await getAttainmentEvaluationRun(
      'eval-2026-071',
    );
    expect(result?.calculation.outcome).toBe('not-achieved');
    expect(result?.calculation.score).toBe(0.68);
    expect(result?.id).toBe('evaluation-ct6');
    expect(result?.runId).toBe('eval-2026-071');
    expect(apiGetMock).toHaveBeenCalledWith(
      '/api/v1/evaluations/runs/{run_id}',
      {
        params: {
          path: {
            run_id: 'eval-2026-071',
          },
        },
      },
    );
  });

  it('maps only the matching contract 404 to a missing run', async () => {
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
      getAttainmentEvaluationRun('eval-unknown'),
    ).resolves.toBeNull();
  });

  it.each([
    {
      data: { ...runDetail, runId: 'eval-2026-072' },
      name: 'mismatched response ID',
      status: 200,
    },
    {
      error: {
        detail: {
          code: 'route_not_found',
          message: 'Not Found',
          runId: 'eval-2026-071',
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
      getAttainmentEvaluationRun('eval-2026-071'),
    ).rejects.toThrow('评价运行读取服务不可用');
  });
});
