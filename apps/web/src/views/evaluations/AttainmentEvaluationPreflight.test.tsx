import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
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
  createEvaluationRunMock,
  getAttainmentEvaluationPreflightFixture,
  getEvaluationPreflightMock,
  installAttainmentEvaluationPageTestEnvironment,
  renderAttainmentEvaluationPage,
  resetAttainmentEvaluationApiMocks,
  restoreAttainmentEvaluationPageTestEnvironment,
} from './testing/attainmentEvaluationPageTestHarness';

async function openPreflightDrawer() {
  const buttons = await screen.findAllByRole('button', {
    name: /处理输入问题/,
  });
  fireEvent.click(buttons[0]!);
  await screen.findByText('输入预检与修复导航');
}

beforeAll(installAttainmentEvaluationPageTestEnvironment);
afterAll(restoreAttainmentEvaluationPageTestEnvironment);

beforeEach(() => {
  window.localStorage.clear();
  resetAttainmentEvaluationApiMocks();
});

afterEach(cleanup);

describe('AttainmentEvaluationPage input preflight', () => {
  it('turns a score-blocked run into a concrete repair explanation', async () => {
    renderAttainmentEvaluationPage(
      '/evaluations?evaluation=evaluation-ct5&run=eval-2026-068',
    );

    await openPreflightDrawer();

    await waitFor(() => {
      expect(getEvaluationPreflightMock).toHaveBeenCalledWith(
        'eval-2026-068',
      );
    });
    expect(document.body.textContent).toContain(
      '已定位 2 个阻断检查',
    );
    expect(document.body.textContent).toContain(
      '团队互评汇总缺少 6 名学生记录',
    );
    expect(document.body.textContent).toContain(
      '团队协作缺少有效得分率',
    );
    expect(document.body.textContent).toContain('评分数据准备');
    expect(document.body.textContent).toContain(
      '预期来源：团队互评汇总 v1.0',
    );
    expect(document.body.textContent).toContain(
      '不接收个人成绩明细，不会修改历史运行或自动重新预检',
    );
    expect(
      screen.getByRole('button', {
        name: /创建试点汇总准备批次/,
      }),
    ).toBeDefined();
    expect(createEvaluationRunMock).not.toHaveBeenCalled();
  });

  it('uses the structured graph action without guessing a target node', async () => {
    const router = renderAttainmentEvaluationPage(
      '/evaluations?evaluation=evaluation-ct1&run=eval-2026-070',
    );

    await openPreflightDrawer();

    expect(
      await screen.findByText('图谱修复目标仍需精确定位'),
    ).toBeDefined();
    expect(
      screen.queryByRole('button', {
        name: /创建试点汇总准备批次/,
      }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole('button', {
        name: /打开能力图谱工作台/,
      }),
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/graph');
      expect(document.body.textContent).toContain(
        '能力图谱测试工作台',
      );
    });
  });

  it('keeps the drawer actionable after a transport failure', async () => {
    getEvaluationPreflightMock
      .mockRejectedValueOnce(new Error('service unavailable'))
      .mockResolvedValueOnce(
        getAttainmentEvaluationPreflightFixture('eval-2026-068'),
      );
    renderAttainmentEvaluationPage(
      '/evaluations?evaluation=evaluation-ct5&run=eval-2026-068',
    );

    await openPreflightDrawer();
    expect(
      await screen.findByText('预检报告不可用'),
    ).toBeDefined();
    fireEvent.click(
      screen.getByRole('button', { name: /重\s*试/ }),
    );

    await waitFor(() => {
      expect(getEvaluationPreflightMock).toHaveBeenCalledTimes(2);
      expect(document.body.textContent).toContain(
        '当前运行仍被输入条件阻断',
      );
    });
  });
});
