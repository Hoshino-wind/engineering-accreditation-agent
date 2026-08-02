import {
  cleanup,
  fireEvent,
  screen,
} from '@testing-library/react';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import {
  CapturePilotScoreBatchErrorMock,
  capturePilotScoreBatchMock,
  getAttainmentEvaluationRunFixture,
  getEvaluationPreflightMock,
  getEvaluationRunMock,
  installAttainmentEvaluationPageTestEnvironment,
  renderAttainmentEvaluationPage,
  resetAttainmentEvaluationApiMocks,
  restoreAttainmentEvaluationPageTestEnvironment,
} from './testing/attainmentEvaluationPageTestHarness';
import {
  createPilotScoreBatchResult,
  createRunWithTwoScoreInputs,
} from './testing/pilotScoreBatchTestFixtures';
import {
  fillTwoInputScoreTotals,
  openPilotScoreBatchModal,
} from './testing/pilotScoreBatchUiTestHelpers';

beforeAll(installAttainmentEvaluationPageTestEnvironment);
afterAll(restoreAttainmentEvaluationPageTestEnvironment);

beforeEach(() => {
  window.localStorage.clear();
  resetAttainmentEvaluationApiMocks();
  const twoInputRun = createRunWithTwoScoreInputs(
    getAttainmentEvaluationRunFixture('eval-2026-068')!,
  );
  getEvaluationRunMock.mockImplementation((runId: string) =>
    Promise.resolve(
      runId === twoInputRun.runId
        ? twoInputRun
        : getAttainmentEvaluationRunFixture(runId) ?? null,
    ),
  );
});

afterEach(cleanup);

describe('AttainmentEvaluationPage pilot aggregate capture', () => {
  it('requires aggregate-only confirmation, preserves all inputs, and retries 503 with one key', async () => {
    capturePilotScoreBatchMock
      .mockRejectedValueOnce(
        new CapturePilotScoreBatchErrorMock(
          '试点汇总评分批次捕获未在当前环境启用',
          {
            code: 'pilot_score_batch_capture_disabled',
            status: 503,
          },
        ),
      )
      .mockImplementationOnce((input) =>
        Promise.resolve(createPilotScoreBatchResult(input)),
      );
    renderAttainmentEvaluationPage(
      '/evaluations?evaluation=evaluation-ct5&run=eval-2026-068',
    );

    await openPilotScoreBatchModal();
    fillTwoInputScoreTotals();
    expect(document.querySelector('input[type="file"]')).toBeNull();

    fireEvent.click(
      screen.getByRole('button', { name: '创建批次' }),
    );
    expect(
      await screen.findByText('请先确认不含个人成绩明细'),
    ).toBeDefined();
    expect(capturePilotScoreBatchMock).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole('checkbox', {
        name: '确认仅录入汇总值，不含姓名、学号或个人成绩明细',
      }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: '创建批次' }),
    );

    expect(
      await screen.findByText('当前环境未启用试点汇总准备批次'),
    ).toBeDefined();
    fireEvent.click(
      screen.getByRole('button', {
        name: '使用同一幂等键重试',
      }),
    );

    expect(
      await screen.findByText('试点汇总准备批次已创建'),
    ).toBeDefined();
    expect(capturePilotScoreBatchMock).toHaveBeenCalledTimes(2);
    const firstRequest = capturePilotScoreBatchMock.mock.calls[0]![0];
    const retriedRequest = capturePilotScoreBatchMock.mock.calls[1]![0];
    expect(retriedRequest).toEqual(firstRequest);
    expect(firstRequest.items).toEqual([
      {
        earnedPointsTotal: '30',
        inputId: 'input-teamwork',
        observedStudentCount: 42,
        possiblePointsTotal: '40',
      },
      {
        earnedPointsTotal: '80',
        inputId: 'input-classroom',
        observedStudentCount: 42,
        possiblePointsTotal: '100',
      },
    ]);
    expect(document.body.textContent).toContain(
      '历史运行 eval-2026-068 的阻断状态未改变',
    );
    expect(
      screen.queryByRole('button', { name: '运行评价' }),
    ).toBeNull();
    expect(getEvaluationPreflightMock).toHaveBeenCalledTimes(1);
  });

  it('shows a blocked batch as an immutable validation result', async () => {
    capturePilotScoreBatchMock.mockImplementationOnce((input) =>
      Promise.resolve(createPilotScoreBatchResult(input, 'blocked')),
    );
    renderAttainmentEvaluationPage(
      '/evaluations?evaluation=evaluation-ct5&run=eval-2026-068',
    );

    await openPilotScoreBatchModal();
    fillTwoInputScoreTotals();
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: '确认仅录入汇总值，不含姓名、学号或个人成绩明细',
      }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: '创建批次' }),
    );

    expect(
      await screen.findByText(
        '试点汇总准备批次已创建，但校验存在阻断',
      ),
    ).toBeDefined();
    expect(document.body.textContent).toContain(
      'score_input.sample_scope',
    );
    expect(document.body.textContent).toContain(
      '受影响输入：input-classroom',
    );
    expect(document.body.textContent).toContain('规范记录0 项');
    expect(document.body.textContent).toContain('正式可用否');
    expect(getEvaluationPreflightMock).toHaveBeenCalledTimes(1);
  });
});
