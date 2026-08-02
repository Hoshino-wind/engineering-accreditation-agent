import {
  cleanup,
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
  getSelectedEvaluationRow,
  installAttainmentEvaluationPageTestEnvironment,
  renderAttainmentEvaluationPage,
  resetAttainmentEvaluationApiMocks,
  restoreAttainmentEvaluationPageTestEnvironment,
} from './testing/attainmentEvaluationPageTestHarness';

beforeAll(installAttainmentEvaluationPageTestEnvironment);
afterAll(restoreAttainmentEvaluationPageTestEnvironment);

beforeEach(() => {
  window.localStorage.clear();
  resetAttainmentEvaluationApiMocks();
});

afterEach(cleanup);

describe('AttainmentEvaluationPage route selection', () => {
  it('opens the requested evaluation object and restores its isolated draft', async () => {
    window.localStorage.setItem(
      'engineering-accreditation.m6-review-drafts.v2',
      JSON.stringify({
        'evaluation-ct6': {
          decision: 'recalculate',
          note: '不应串入运行的对象级旧草稿',
        },
        'eval-2026-071': {
          decision: 'confirm',
          note: '跨模块恢复的复核依据',
        },
      }),
    );

    renderAttainmentEvaluationPage(
      '/evaluations?evaluation=evaluation-ct6&run=eval-2026-071',
    );

    await waitFor(() => {
      expect(getSelectedEvaluationRow()?.textContent).toContain('CT-6');
    });
    expect(document.body.textContent).toContain('工程规范与伦理');
    expect(document.body.textContent).toContain('计算机网络');
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText<HTMLTextAreaElement>(
          '说明复核依据、发现的问题或重算建议（非必填）',
        ).value,
      ).toBe('跨模块恢复的复核依据');
    });
  });

  it('keeps the current default when no evaluation is requested', async () => {
    renderAttainmentEvaluationPage('/evaluations');

    await waitFor(() => {
      expect(getSelectedEvaluationRow()?.textContent).toContain('CT-3');
    });
    expect(document.body.textContent).toContain('算法设计正确性');
  });

  it('warns and falls back safely when the requested evaluation does not exist', async () => {
    const router = renderAttainmentEvaluationPage(
      '/evaluations?focus=review&evaluation=missing-evaluation',
    );

    await waitFor(() => {
      expect(document.body.textContent).toContain(
        '未找到指定评价对象 missing-evaluation，已显示当前可处理对象',
      );
      expect(router.state.location.search).toBe(
        '?focus=review&evaluation=evaluation-ct3&run=eval-2026-066',
      );
    });
    expect(getSelectedEvaluationRow()?.textContent).toContain('CT-3');
    expect(document.body.textContent).toContain('算法设计正确性');
  });
});
