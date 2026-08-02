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
  capturePilotScoreBatch,
  type CapturePilotScoreBatchError,
} from './capturePilotScoreBatch';

const request = {
  baseRunId: 'Eval-Base-068',
  evaluationObjectId: 'Evaluation-CT5',
  idempotencyKey: 'm6-pilot-score:CaseSensitive-Key',
  items: [
    {
      earnedPointsTotal: '9007199254740993',
      inputId: 'Input-Primary',
      observedStudentCount: 42,
      possiblePointsTotal: '9999999999999999',
    },
  ],
};

function createBatch(validationStatus: 'blocked' | 'pilot_ready') {
  const blocked = validationStatus === 'blocked';
  return {
    baseContextDigest: 'sha256:base',
    baseRunId: request.baseRunId,
    batchId: 'score-batch-001',
    candidateItems: request.items,
    contentDigest: 'sha256:content',
    createdAt: '2026-08-02T10:00:00+08:00',
    evaluationObjectId: request.evaluationObjectId,
    formalUsable: false as const,
    profile: 'local-pilot-aggregate:v1' as const,
    recordGranularity: 'aggregate' as const,
    records: blocked
      ? []
      : [
          {
            ...request.items[0]!,
            recordId: 'score-record-001',
            scoreRate: '0.90072',
          },
        ],
    schemaVersion: 'score-import-batch:v1' as const,
    scope: 'local_pilot_aggregate' as const,
    sourceKind: 'structured_json' as const,
    validationReport: {
      checks: blocked
        ? [
            {
              affectedInputIds: ['Input-Primary'],
              code: 'score_input.sample_scope',
              expected: '42',
              observed: '40',
              status: 'blocked' as const,
            },
          ]
        : [],
      createdAt: '2026-08-02T10:00:00+08:00',
      limitations: ['formal_audit_unavailable'],
      reportDigest: 'sha256:report',
      reportId: 'score-report-001',
      reportVersion: 'score-import-validation:v1',
      validationStatus,
      validatorVersion: 'score-import-validator 0.1.0',
    },
  };
}

beforeEach(() => {
  apiPostMock.mockReset();
});

describe('capturePilotScoreBatch', () => {
  it('posts exact opaque IDs, canonical Decimal strings, and idempotency key', async () => {
    apiPostMock.mockResolvedValue({
      data: {
        batch: createBatch('pilot_ready'),
        idempotentReplay: false,
      },
      response: new Response(null, { status: 201 }),
    });

    const created = await capturePilotScoreBatch(request);

    expect(apiPostMock).toHaveBeenCalledWith(
      '/api/v1/evaluations/score-import-batches',
      {
        body: {
          baseRunId: 'Eval-Base-068',
          evaluationObjectId: 'Evaluation-CT5',
          items: [
            {
              earnedPointsTotal: '9007199254740993',
              inputId: 'Input-Primary',
              observedStudentCount: 42,
              possiblePointsTotal: '9999999999999999',
            },
          ],
          profile: 'local-pilot-aggregate:v1',
        },
        params: {
          header: {
            'Idempotency-Key': 'm6-pilot-score:CaseSensitive-Key',
          },
        },
      },
    );
    expect(created.batch.validationReport.validationStatus).toBe(
      'pilot_ready',
    );
    expect(created.batch.formalUsable).toBe(false);
  });

  it('returns a blocked immutable batch as a valid 201 result', async () => {
    apiPostMock.mockResolvedValue({
      data: {
        batch: createBatch('blocked'),
        idempotentReplay: false,
      },
      response: new Response(null, { status: 201 }),
    });

    const created = await capturePilotScoreBatch(request);

    expect(created.batch.records).toEqual([]);
    expect(created.batch.validationReport).toMatchObject({
      checks: [
        {
          affectedInputIds: ['Input-Primary'],
          code: 'score_input.sample_scope',
          status: 'blocked',
        },
      ],
      validationStatus: 'blocked',
    });
  });

  it('maps a disabled 503 response to a typed retryable error', async () => {
    apiPostMock.mockResolvedValue({
      error: {
        detail: {
          code: 'pilot_score_batch_capture_disabled',
          message: '试点汇总评分批次捕获未在当前环境启用',
        },
      },
      response: new Response(null, { status: 503 }),
    });

    await expect(capturePilotScoreBatch(request)).rejects.toMatchObject({
      code: 'pilot_score_batch_capture_disabled',
      message: '试点汇总评分批次捕获未在当前环境启用',
      name: 'CapturePilotScoreBatchError',
      status: 503,
    } satisfies Partial<CapturePilotScoreBatchError>);
  });

  it('rejects a response that weakens the pilot-only boundary', async () => {
    apiPostMock.mockResolvedValue({
      data: {
        batch: {
          ...createBatch('pilot_ready'),
          formalUsable: true,
        },
        idempotentReplay: false,
      },
      response: new Response(null, { status: 201 }),
    });

    await expect(capturePilotScoreBatch(request)).rejects.toThrow(
      '响应不完整',
    );
  });
});
