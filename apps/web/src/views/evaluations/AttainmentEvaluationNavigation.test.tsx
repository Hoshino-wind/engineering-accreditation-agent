import {
  act,
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
  getEvaluationRow,
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

describe('AttainmentEvaluationPage navigation and filtering', () => {
  it('syncs manual selection to the URL and follows history changes', async () => {
    const router = renderAttainmentEvaluationPage(
      '/evaluations?focus=review&evaluation=evaluation-ct6',
    );

    await waitFor(() => {
      expect(getEvaluationRow('CT-3')).toBeDefined();
    });
    fireEvent.click(getEvaluationRow('CT-3')!);

    await waitFor(() => {
      expect(router.state.location.search).toBe(
        '?focus=review&evaluation=evaluation-ct3&run=eval-2026-066',
      );
      expect(getSelectedEvaluationRow()?.textContent).toContain('CT-3');
    });

    await act(async () => {
      await router.navigate(-1);
    });

    await waitFor(() => {
      expect(router.state.location.search).toBe(
        '?focus=review&evaluation=evaluation-ct6&run=eval-2026-071',
      );
      expect(getSelectedEvaluationRow()?.textContent).toContain('CT-6');
    });

    await act(async () => {
      await router.navigate(1);
    });

    await waitFor(() => {
      expect(router.state.location.search).toBe(
        '?focus=review&evaluation=evaluation-ct3&run=eval-2026-066',
      );
      expect(getSelectedEvaluationRow()?.textContent).toContain('CT-3');
    });
  });

  it('keeps filters, history, URL and evaluation details consistent', async () => {
    const router = renderAttainmentEvaluationPage(
      '/evaluations?evaluation=evaluation-ct6&run=eval-2026-071',
    );

    await waitFor(() => {
      expect(
        screen.getByRole('textbox', {
          name: '搜索课程目标或课程名称',
        }),
      ).toBeDefined();
    });
    fireEvent.change(
      screen.getByRole('textbox', {
        name: '搜索课程目标或课程名称',
      }),
      {
        target: { value: '算法设计' },
      },
    );

    await waitFor(() => {
      expect(router.state.location.search).toBe(
        '?evaluation=evaluation-ct3&run=eval-2026-066',
      );
      expect(getSelectedEvaluationRow()?.textContent).toContain('CT-3');
      expect(document.body.textContent).toContain('算法设计正确性');
    });

    await act(async () => {
      await router.navigate(-1);
    });

    await waitFor(() => {
      expect(router.state.location.search).toBe(
        '?evaluation=evaluation-ct6&run=eval-2026-071',
      );
      expect(getSelectedEvaluationRow()?.textContent).toContain('CT-6');
      expect(
        screen.getByRole<HTMLInputElement>('textbox', {
          name: '搜索课程目标或课程名称',
        }).value,
      ).toBe('');
      expect(document.body.textContent).toContain('工程规范与伦理');
    });
  });

  it('restores the selected evaluation when filters would leave no visible row', async () => {
    const router = renderAttainmentEvaluationPage(
      '/evaluations?evaluation=evaluation-ct6&run=eval-2026-071',
    );

    await waitFor(() => {
      expect(
        screen.getByRole('textbox', {
          name: '搜索课程目标或课程名称',
        }),
      ).toBeDefined();
    });
    fireEvent.change(
      screen.getByRole('textbox', {
        name: '搜索课程目标或课程名称',
      }),
      {
        target: { value: '不存在的评价对象' },
      },
    );

    await waitFor(() => {
      expect(router.state.location.search).toBe(
        '?evaluation=evaluation-ct6&run=eval-2026-071',
      );
      expect(
        screen.getByRole<HTMLInputElement>('textbox', {
          name: '搜索课程目标或课程名称',
        }).value,
      ).toBe('');
      expect(getSelectedEvaluationRow()?.textContent).toContain('CT-6');
    });
  });
});
