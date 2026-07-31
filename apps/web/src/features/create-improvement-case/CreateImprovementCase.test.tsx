import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { App as AntdApp } from 'antd';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { readWorkflowEvents } from '../../entities/workflow-event';
import {
  CreateImprovementCase,
  usePrototypeOnlyImprovementCases,
} from './index';

beforeAll(() => {
  const getComputedStyle = window.getComputedStyle.bind(window);
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element) =>
    getComputedStyle(element),
  );
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
});

afterAll(() => {
  vi.restoreAllMocks();
});

function FeatureHarness() {
  const { cases, createIssue, localIssueCount } =
    usePrototypeOnlyImprovementCases();

  return (
    <>
      <span data-testid="local-issue-count">{localIssueCount}</span>
      <span data-testid="case-count">{cases.length}</span>
      <span data-testid="first-case-title">{cases[0]?.title}</span>
      <CreateImprovementCase onCreate={createIssue} />
    </>
  );
}

function renderFeature() {
  render(
    <AntdApp>
      <FeatureHarness />
    </AntdApp>,
  );
}

async function getOpenDialog() {
  let dialog: HTMLElement | null = null;

  await waitFor(() => {
    dialog = document.querySelector<HTMLElement>(
      '.ant-modal-wrap:not([style*="display: none"]) [role="dialog"]',
    );
    expect(dialog).not.toBeNull();
  });

  return dialog!;
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(cleanup);

describe('CreateImprovementCase public behavior', () => {
  it('shows the current defaults and keeps the draft after cancellation', async () => {
    renderFeature();

    fireEvent.click(
      screen.getByRole('button', { name: /新建改进问题/ }),
    );
    const dialog = await getOpenDialog();
    const createButton = dialog.querySelector<HTMLButtonElement>(
      '.ant-modal-footer .ant-btn-primary',
    )!;

    expect(createButton.hasAttribute('disabled')).toBe(true);
    expect(dialog.textContent).toContain('M5 图谱诊断');
    expect(dialog.textContent).toContain('软件工程');
    expect(dialog.textContent).toContain('课程负责人');

    const titleInput = dialog.querySelector<HTMLInputElement>(
      'input[placeholder="例如：课程目标 3 的实验证据覆盖不足"]',
    )!;
    fireEvent.change(titleInput, {
      target: { value: '未提交的改进草稿' },
    });
    expect(createButton.hasAttribute('disabled')).toBe(false);

    const cancelButton = dialog.querySelector<HTMLButtonElement>(
      '.ant-modal-footer .ant-btn-default',
    )!;
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(
        dialog.classList.contains('ant-zoom-leave'),
      ).toBe(true);
    });
    expect(titleInput).toHaveProperty(
      'value',
      '未提交的改进草稿',
    );
  });

  it('prepends the created case and records the compatible local event', async () => {
    renderFeature();

    expect(screen.getByTestId('local-issue-count').textContent).toBe('0');
    expect(screen.getByTestId('case-count').textContent).toBe('6');
    fireEvent.click(
      screen.getByRole('button', { name: /新建改进问题/ }),
    );
    const dialog = await getOpenDialog();
    fireEvent.change(
      dialog.querySelector<HTMLInputElement>(
        'input[placeholder="例如：课程目标 3 的实验证据覆盖不足"]',
      )!,
      {
        target: { value: '  实验证据覆盖不足  ' },
      },
    );
    fireEvent.click(
      dialog.querySelector<HTMLButtonElement>(
        '.ant-modal-footer .ant-btn-primary',
      )!,
    );

    await waitFor(() => {
      expect(screen.getByTestId('local-issue-count').textContent).toBe(
        '1',
      );
    });
    expect(screen.getByTestId('case-count').textContent).toBe('7');
    expect(screen.getByTestId('first-case-title').textContent).toBe(
      '实验证据覆盖不足',
    );
    expect(
      JSON.parse(
        window.localStorage.getItem(
          'engineering-accreditation.m7-local-issues.v1',
        ) ?? '[]',
      ),
    ).toMatchObject([
      {
        course: '软件工程',
        owner: '课程负责人',
        source: 'M5',
        title: '实验证据覆盖不足',
      },
    ]);
    expect(readWorkflowEvents()[0]).toMatchObject({
      action: '新建改进问题',
      actor: '当前用户',
      module: 'M7',
      status: 'pending',
      summary: '实验证据覆盖不足 · 课程负责人',
    });
    await waitFor(() => {
      expect(document.body.textContent).toContain(
        '改进问题已创建，并写入审计轨迹',
      );
    });
  });
});
