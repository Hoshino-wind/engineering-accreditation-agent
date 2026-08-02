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
  getSelectedCaseRow,
  installImprovementPageTestEnvironment,
  renderImprovementPage,
  restoreImprovementPageTestEnvironment,
} from './testing/improvementPageTestHarness';

beforeAll(installImprovementPageTestEnvironment);
afterAll(restoreImprovementPageTestEnvironment);

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(cleanup);

describe('TeachingImprovementPage route resilience', () => {
  it('restores the selected case when filters would leave no visible row', async () => {
    const router = renderImprovementPage(
      '/improvements?case=qi-2026-015',
    );

    fireEvent.change(
      screen.getByRole('textbox', { name: '搜索改进问题' }),
      {
        target: { value: '不存在的改进问题' },
      },
    );

    await waitFor(() => {
      expect(router.state.location.search).toBe(
        '?case=qi-2026-015',
      );
      expect(
        screen.getByRole<HTMLInputElement>('textbox', {
          name: '搜索改进问题',
        }).value,
      ).toBe('');
      expect(getSelectedCaseRow()?.textContent).toContain('QI-015');
    });
  });

  it('warns and canonicalizes an invalid case ID', async () => {
    const router = renderImprovementPage(
      '/improvements?focus=closure&case=missing-case',
    );

    await waitFor(() => {
      expect(document.body.textContent).toContain(
        '未找到指定改进问题 missing-case，已显示当前可处理问题',
      );
      expect(router.state.location.search).toBe(
        '?focus=closure&case=qi-2026-017',
      );
    });
    expect(getSelectedCaseRow()?.textContent).toContain('QI-017');
    expect(document.body.textContent).toContain(
      '工程规范与伦理未达标',
    );
  });
});
