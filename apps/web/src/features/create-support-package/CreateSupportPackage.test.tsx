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
  CreateSupportPackage,
  usePrototypeOnlySupportPackages,
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
  const { createPackage, localPackageCount, packages } =
    usePrototypeOnlySupportPackages();

  return (
    <>
      <span data-testid="local-package-count">
        {localPackageCount}
      </span>
      <span data-testid="package-count">{packages.length}</span>
      <span data-testid="first-package-title">
        {packages[0]?.title}
      </span>
      <CreateSupportPackage onCreate={createPackage} />
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

describe('CreateSupportPackage public behavior', () => {
  it('shows the defaults and preserves the draft after cancellation', async () => {
    renderFeature();

    fireEvent.click(
      screen.getByRole('button', { name: /新建支撑包/ }),
    );
    const dialog = await getOpenDialog();
    const createButton = dialog.querySelector<HTMLButtonElement>(
      '.ant-modal-footer .ant-btn-primary',
    )!;

    expect(createButton.hasAttribute('disabled')).toBe(true);
    expect(dialog.textContent).toContain('软件工程');
    expect(dialog.textContent).toContain('课程教学支撑');

    const titleInput = dialog.querySelector<HTMLInputElement>(
      'input[placeholder="例如：2026 届软件工程课程认证支撑包"]',
    )!;
    fireEvent.change(titleInput, {
      target: { value: '未提交的支撑包草稿' },
    });
    expect(createButton.hasAttribute('disabled')).toBe(false);

    fireEvent.click(
      dialog.querySelector<HTMLButtonElement>(
        '.ant-modal-footer .ant-btn-default',
      )!,
    );

    await waitFor(() => {
      expect(dialog.classList.contains('ant-zoom-leave')).toBe(true);
    });
    fireEvent.click(
      screen.getByRole('button', { name: /新建支撑包/ }),
    );
    await waitFor(() => {
      expect(dialog.classList.contains('ant-zoom-leave')).toBe(false);
    });
    const reopenedDialog = await getOpenDialog();

    expect(
      reopenedDialog.querySelector<HTMLInputElement>(
        'input[placeholder="例如：2026 届软件工程课程认证支撑包"]',
      ),
    ).toHaveProperty('value', '未提交的支撑包草稿');
    expect(reopenedDialog.textContent).toContain('软件工程');
    expect(reopenedDialog.textContent).toContain('课程教学支撑');
  });

  it('prepends the package and records the compatible M8 event', async () => {
    renderFeature();

    expect(screen.getByTestId('local-package-count').textContent).toBe(
      '0',
    );
    expect(screen.getByTestId('package-count').textContent).toBe('5');
    fireEvent.click(
      screen.getByRole('button', { name: /新建支撑包/ }),
    );
    const dialog = await getOpenDialog();
    const titleInput = dialog.querySelector<HTMLInputElement>(
      'input[placeholder="例如：2026 届软件工程课程认证支撑包"]',
    )!;
    fireEvent.change(titleInput, {
      target: { value: '  软件工程认证支撑包  ' },
    });
    fireEvent.click(
      dialog.querySelector<HTMLButtonElement>(
        '.ant-modal-footer .ant-btn-primary',
      )!,
    );

    await waitFor(() => {
      expect(screen.getByTestId('local-package-count').textContent).toBe(
        '1',
      );
    });
    expect(screen.getByTestId('package-count').textContent).toBe('6');
    expect(screen.getByTestId('first-package-title').textContent).toBe(
      '软件工程认证支撑包',
    );
    const storedPackages = JSON.parse(
      window.localStorage.getItem(
        'engineering-accreditation.m8-local-packages.v1',
      ) ?? '[]',
    ) as Array<{ id: string }>;
    expect(storedPackages).toMatchObject([
      {
        course: '软件工程',
        template: 'course-teaching',
        title: '软件工程认证支撑包',
      },
    ]);
    expect(readWorkflowEvents()[0]).toMatchObject({
      action: '新建认证支撑包',
      actor: '当前用户',
      module: 'M8',
      objectId: storedPackages[0]?.id,
      status: 'pending',
      summary: '软件工程认证支撑包 · 软件工程',
    });
    fireEvent.click(
      screen.getByRole('button', { name: /新建支撑包/ }),
    );
    await waitFor(() => {
      expect(
        document.querySelector<HTMLInputElement>(
          '.ant-modal-wrap input[placeholder="例如：2026 届软件工程课程认证支撑包"]',
        )?.value,
      ).toBe('');
    });
    await waitFor(() => {
      expect(document.body.textContent).toContain(
        '支撑包草稿已创建，并写入审计轨迹',
      );
    });
  });
});
