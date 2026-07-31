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
  getCaseRow,
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

describe('TeachingImprovementPage route selection', () => {
  it('opens the requested case and restores its isolated draft', async () => {
    window.localStorage.setItem(
      'engineering-accreditation.m7-effectiveness-drafts.v1',
      JSON.stringify({
        'qi-2026-015': {
          effectiveness: 'partially-effective',
          note: '跨页面恢复的判断依据',
        },
      }),
    );

    renderImprovementPage('/improvements?case=qi-2026-015');

    await waitFor(() => {
      expect(getSelectedCaseRow()?.textContent).toContain('QI-015');
    });
    expect(
      screen.getByPlaceholderText<HTMLTextAreaElement>(
        '说明判断依据与后续决定',
      ).value,
    ).toBe('跨页面恢复的判断依据');
    expect(document.body.textContent).toContain(
      '实验名称在材料与图谱中不一致',
    );
  }, 15_000);

  it('syncs manual selection to the URL and follows history changes', async () => {
    const router = renderImprovementPage(
      '/improvements?focus=closure&case=qi-2026-015',
    );

    fireEvent.click(getCaseRow('QI-014')!);

    await waitFor(() => {
      expect(router.state.location.search).toBe(
        '?focus=closure&case=qi-2026-014',
      );
      expect(getSelectedCaseRow()?.textContent).toContain('QI-014');
    });

    await act(async () => {
      await router.navigate(-1);
    });

    await waitFor(() => {
      expect(router.state.location.search).toBe(
        '?focus=closure&case=qi-2026-015',
      );
      expect(getSelectedCaseRow()?.textContent).toContain('QI-015');
    });
  });

  it('keeps filters, history, URL and the operated case consistent', async () => {
    const router = renderImprovementPage(
      '/improvements?case=qi-2026-015',
    );

    fireEvent.change(
      screen.getByRole('textbox', { name: '搜索改进问题' }),
      {
        target: { value: '团队互评' },
      },
    );

    await waitFor(() => {
      expect(router.state.location.search).toBe(
        '?case=qi-2026-014',
      );
      expect(getSelectedCaseRow()?.textContent).toContain('QI-014');
      expect(document.body.textContent).toContain(
        '团队评价缺少个人贡献数据',
      );
    });

    await act(async () => {
      await router.navigate(-1);
    });

    await waitFor(() => {
      expect(router.state.location.search).toBe(
        '?case=qi-2026-015',
      );
      expect(getSelectedCaseRow()?.textContent).toContain('QI-015');
      expect(
        screen.getByRole<HTMLInputElement>('textbox', {
          name: '搜索改进问题',
        }).value,
      ).toBe('');
      expect(document.body.textContent).toContain(
        '实验名称在材料与图谱中不一致',
      );
    });
  });

  it('restores a locally created case and its draft from a stable URL', async () => {
    const localCaseId = 'IMPR-LOCAL-20260731001';
    window.localStorage.setItem(
      'engineering-accreditation.m7-local-issues.v1',
      JSON.stringify([
        {
          course: '计算机网络',
          createdAt: '2026-07-31T03:00:00.000Z',
          id: localCaseId,
          owner: '课程负责人',
          source: 'M6',
          title: '本地创建的复评问题',
        },
      ]),
    );
    window.localStorage.setItem(
      'engineering-accreditation.m7-effectiveness-drafts.v1',
      JSON.stringify({
        [localCaseId]: {
          effectiveness: 'ineffective',
          note: '本地问题独立判断草稿',
        },
      }),
    );

    renderImprovementPage(`/improvements?case=${localCaseId}`);

    await waitFor(() => {
      expect(getSelectedCaseRow()?.textContent).toContain(
        'QI-LOCAL-20260731001',
      );
    });
    expect(document.body.textContent).toContain(
      '本地创建的复评问题',
    );
    expect(document.body.textContent).toContain('当前 7 / 共 7 项');
    expect(
      screen.getByPlaceholderText<HTMLTextAreaElement>(
        '说明判断依据与后续决定',
      ).value,
    ).toBe('本地问题独立判断草稿');
  });

  it('warns and falls back safely when the requested case does not exist', async () => {
    renderImprovementPage('/improvements?case=missing-case');

    await waitFor(() => {
      expect(document.body.textContent).toContain(
        '未找到指定改进问题 missing-case，已显示当前可处理问题',
      );
    });
    expect(getSelectedCaseRow()?.textContent).toContain('QI-017');
    expect(document.body.textContent).toContain(
      '工程规范与伦理未达标',
    );
  });
});
