import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  CreateEvaluationRunErrorMock,
  createEvaluationRunMock,
  getAttainmentEvaluationRunFixture,
  installAttainmentEvaluationPageTestEnvironment,
  renderAttainmentEvaluationPage,
  resetAttainmentEvaluationApiMocks,
  restoreAttainmentEvaluationPageTestEnvironment,
} from './testing/attainmentEvaluationPageTestHarness';

const sourceRun = getAttainmentEvaluationRunFixture('eval-2026-071')!;
const createdRun = {
  ...sourceRun,
  approvalStatus: 'not_submitted' as const,
  runId: 'eval-created-071',
  sourceRunId: 'eval-2026-071',
};

async function openRunModal() {
  await waitFor(() => {
    expect(
      screen.getByRole<HTMLButtonElement>('button', {
        name: /运行评价/,
      }).disabled,
    ).toBe(false);
  });
  fireEvent.click(
    screen.getByRole('button', {
      name: /运行评价/,
    }),
  );
}

beforeAll(installAttainmentEvaluationPageTestEnvironment);
afterAll(restoreAttainmentEvaluationPageTestEnvironment);

beforeEach(() => {
  window.localStorage.clear();
  resetAttainmentEvaluationApiMocks();
  createEvaluationRunMock.mockResolvedValue({
    idempotentReplay: false,
    run: createdRun,
    sourceRunId: 'eval-2026-071',
  });
});

afterEach(cleanup);

describe('AttainmentEvaluationPage run creation', () => {
  it('creates from the exact ready snapshot and opens the new run', async () => {
    const router = renderAttainmentEvaluationPage(
      '/evaluations?focus=review&evaluation=evaluation-ct6&run=eval-2026-071',
    );

    await openRunModal();

    expect(
      await screen.findByText('基于已就绪快照运行评价'),
    ).toBeDefined();
    expect(document.body.textContent).toContain('eval-2026-071');
    expect(document.body.textContent).toContain('图谱 v0.3');

    fireEvent.click(
      screen.getByRole('button', { name: '确认并运行' }),
    );

    await waitFor(() => {
      expect(createEvaluationRunMock).toHaveBeenCalledTimes(1);
      const input = createEvaluationRunMock.mock.calls[0]?.[0];
      expect(input?.evaluationObjectId).toBe('evaluation-ct6');
      expect(input?.idempotencyKey).toMatch(
        /^m6-run:[0-9a-f-]{36}$/,
      );
      expect(input?.sourceRunId).toBe('eval-2026-071');
      expect(router.state.location.search).toBe(
        '?focus=review&evaluation=evaluation-ct6&run=eval-created-071',
      );
    });
    await waitFor(() => {
      expect(document.body.textContent).toContain(
        '正在查看非当前展示运行',
      );
      expect(document.body.textContent).toContain('eval-created-071');
      expect(document.body.textContent).toContain(
        '队列焦点保持不变',
      );
    });
  });

  it('uses an explicitly requested non-presented run as the source', async () => {
    const source072 = getAttainmentEvaluationRunFixture('eval-2026-072')!;
    createEvaluationRunMock.mockResolvedValue({
      idempotentReplay: false,
      run: {
        ...source072,
        approvalStatus: 'not_submitted',
        runId: 'eval-created-072',
        sourceRunId: 'eval-2026-072',
      },
      sourceRunId: 'eval-2026-072',
    });
    renderAttainmentEvaluationPage(
      '/evaluations?evaluation=evaluation-ct6&run=eval-2026-072',
    );

    await openRunModal();

    expect(
      await screen.findByText('正在基于非队列焦点运行重算'),
    ).toBeDefined();
    expect(document.body.textContent).toContain(
      '本次精确使用 eval-2026-072',
    );
    fireEvent.click(
      screen.getByRole('button', { name: '确认并运行' }),
    );

    await waitFor(() => {
      expect(createEvaluationRunMock.mock.calls[0]?.[0]).toEqual(
        expect.objectContaining({
          evaluationObjectId: 'evaluation-ct6',
          sourceRunId: 'eval-2026-072',
        }),
      );
    });
  });

  it('does not submit a blocked source snapshot', async () => {
    renderAttainmentEvaluationPage(
      '/evaluations?evaluation=evaluation-ct5&run=eval-2026-068',
    );

    const repairButtons = await screen.findAllByRole('button', {
      name: /处理输入问题/,
    });
    fireEvent.click(repairButtons[0]!);

    expect(
      await screen.findByText('输入预检与修复导航'),
    ).toBeDefined();
    expect(
      await screen.findByRole('button', {
        name: /创建试点汇总准备批次/,
      }),
    ).toBeDefined();
    expect(
      screen.queryByRole('button', { name: /运行评价/ }),
    ).toBeNull();
    expect(createEvaluationRunMock).not.toHaveBeenCalled();
  });

  it('reuses the same idempotency key after a transport failure', async () => {
    createEvaluationRunMock
      .mockRejectedValueOnce(
        new CreateEvaluationRunErrorMock(
          '试点重算服务暂不可用，请检查本地 API 后重试',
        ),
      )
      .mockResolvedValueOnce({
        idempotentReplay: true,
        run: createdRun,
        sourceRunId: 'eval-2026-071',
      });
    renderAttainmentEvaluationPage(
      '/evaluations?evaluation=evaluation-ct6&run=eval-2026-071',
    );

    await openRunModal();
    fireEvent.click(
      await screen.findByRole('button', { name: '确认并运行' }),
    );
    expect(await screen.findByText('运行创建失败')).toBeDefined();

    const firstKey = createEvaluationRunMock.mock.calls[0]?.[0]
      .idempotencyKey as string;
    fireEvent.click(
      screen.getByRole('button', { name: '重试创建' }),
    );

    await waitFor(() => {
      expect(createEvaluationRunMock).toHaveBeenCalledTimes(2);
      expect(
        createEvaluationRunMock.mock.calls[1]?.[0].idempotencyKey,
      ).toBe(firstKey);
      expect(document.body.textContent).toContain(
        '已恢复先前创建的运行，未产生重复运行',
      );
    });
  });
});
