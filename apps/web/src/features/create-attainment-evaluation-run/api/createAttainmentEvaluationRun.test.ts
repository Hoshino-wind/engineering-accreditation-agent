import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiPostMock } = vi.hoisted(() => ({
  apiPostMock: vi.fn(),
}));

vi.mock('../../../shared/api/client', () => ({
  apiClient: {
    POST: apiPostMock,
  },
}));

import {
  createAttainmentEvaluationRun,
} from './createAttainmentEvaluationRun';
import type { CreateAttainmentEvaluationRunError } from './createAttainmentEvaluationRun';

const createdRun = {
  approvalStatus: 'not_submitted' as const,
  calculation: {
    blockers: [],
    contributions: [
      {
        input: {
          evidenceName: '网络工程案例评分表',
          id: 'input-standard',
          label: '工程规范应用',
          scoreRate: 0.7,
          weight: 1,
        },
        value: 0.7,
      },
    ],
    ready: true,
    result: {
      outcome: 'achieved' as const,
      score: 0.7,
    },
    weightTotal: 1,
  },
  evaluationObject: {
    abilityCode: 'BA-5',
    abilityName: '工程规范与职业伦理',
    course: '计算机网络',
    evaluationObjectId: 'Evaluation-CT6',
    objectiveCode: 'CT-6',
    objectiveName: '工程规范与职业伦理',
  },
  evidence: [],
  graphVersion: '图谱 v0.3',
  inputSnapshot: {
    createdAt: '2026-08-01T08:00:00Z',
    hash: `sha256:${'a'.repeat(64)}`,
  },
  inputs: [
    {
      evidenceName: '网络工程案例评分表',
      id: 'input-standard',
      label: '工程规范应用',
      scoreRate: 0.7,
      weight: 1,
    },
  ],
  policyVersion: 'policy v1.2',
  programVersion: 'evaluator 0.8.0',
  readinessChecks: [
    {
      detail: '输入已就绪',
      id: 'ready',
      label: '输入已就绪',
      status: 'pass' as const,
    },
  ],
  runId: 'eval-created',
  scoreSnapshot: '2026-05-12',
  sourceRunId: 'Eval-Source-071',
  studentCount: 40,
  threshold: 0.7,
};

beforeEach(() => {
  apiPostMock.mockReset();
});

describe('createAttainmentEvaluationRun', () => {
  it('passes opaque IDs and the idempotency key exactly', async () => {
    apiPostMock.mockResolvedValue({
      data: {
        idempotentReplay: false,
        run: createdRun,
        sourceRunId: 'Eval-Source-071',
      },
      response: new Response(null, { status: 201 }),
    });

    const result = await createAttainmentEvaluationRun({
      evaluationObjectId: 'Evaluation-CT6',
      idempotencyKey: 'm6-run:CaseSensitive-Key',
      sourceRunId: 'Eval-Source-071',
    });

    expect(apiPostMock).toHaveBeenCalledWith(
      '/api/v1/evaluations/runs',
      {
        body: {
          evaluationObjectId: 'Evaluation-CT6',
          sourceRunId: 'Eval-Source-071',
        },
        params: {
          header: {
            'Idempotency-Key': 'm6-run:CaseSensitive-Key',
          },
        },
      },
    );
    expect(result.run.runId).toBe('eval-created');
    expect(result.run.sourceRunId).toBe('Eval-Source-071');
    expect(result.idempotentReplay).toBe(false);
  });

  it('preserves the typed business error and blockers', async () => {
    apiPostMock.mockResolvedValue({
      error: {
        detail: {
          blockers: ['评分输入缺失'],
          code: 'evaluation_source_run_not_ready',
          message: '来源运行的评价输入尚未就绪',
          sourceRunId: 'eval-2026-068',
        },
      },
      response: new Response(null, { status: 409 }),
    });

    const promise = createAttainmentEvaluationRun({
      evaluationObjectId: 'evaluation-ct5',
      idempotencyKey: 'm6-run:blocked',
      sourceRunId: 'eval-2026-068',
    });

    await expect(promise).rejects.toMatchObject({
      blockers: ['评分输入缺失'],
      code: 'evaluation_source_run_not_ready',
      message: '来源运行的评价输入尚未就绪',
      name: 'CreateAttainmentEvaluationRunError',
    } satisfies Partial<CreateAttainmentEvaluationRunError>);
  });

  it('rejects a response that does not preserve the source lineage', async () => {
    apiPostMock.mockResolvedValue({
      data: {
        idempotentReplay: false,
        run: createdRun,
        sourceRunId: 'eval-other-source',
      },
      response: new Response(null, { status: 201 }),
    });

    await expect(
      createAttainmentEvaluationRun({
        evaluationObjectId: 'Evaluation-CT6',
        idempotencyKey: 'm6-run:lineage-check',
        sourceRunId: 'Eval-Source-071',
      }),
    ).rejects.toThrow('评价运行创建响应不完整');
  });

  it('maps transport failures without changing the request intent', async () => {
    apiPostMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(
      createAttainmentEvaluationRun({
        evaluationObjectId: 'evaluation-ct6',
        idempotencyKey: 'm6-run:network-retry',
        sourceRunId: 'eval-2026-071',
      }),
    ).rejects.toThrow('试点重算服务暂不可用');
  });
});
