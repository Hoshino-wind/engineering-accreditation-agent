import {
  cleanup,
  fireEvent,
  render,
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
  vi,
} from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';

import { recordWorkflowEvent } from '../../../../entities/workflow-event';
import { AppProviders } from '../../../providers/AppProviders';
import { AppShell } from '../index';

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

function renderAppShell(initialEntry = '/') {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <AppShell />,
        children: [
          {
            index: true,
            element: <div>总览内容</div>,
          },
          {
            path: 'resources',
            element: <div>材料内容</div>,
          },
          {
            path: 'governance',
            element: <div>治理内容</div>,
          },
        ],
      },
    ],
    { initialEntries: [initialEntry] },
  );

  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );

  return router;
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(cleanup);

describe('AppShell public behavior', () => {
  it('navigates from the controlled menu and updates route presentation', async () => {
    const router = renderAppShell();
    const shell = document.querySelector<HTMLElement>('.app-shell')!;
    const sider = shell.children.item(0)!;
    const nestedLayout = shell.children.item(1)!;

    expect(sider).toBe(screen.getByRole('complementary'));
    expect(nestedLayout.children[0]).toBe(screen.getByRole('banner'));
    expect(nestedLayout.children[1]).toBe(screen.getByRole('main'));

    fireEvent.click(
      screen.getByRole('menuitem', {
        name: /材料与资源/,
      }),
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/resources');
    });
    expect(screen.getByRole('navigation').textContent).toContain(
      '构建能力图谱',
    );
    expect(screen.getByRole('navigation').textContent).toContain(
      '教学资源与材料',
    );
    const content = screen.getByRole('main');
    expect(content.classList.contains('app-content')).toBe(true);
    expect(
      content.classList.contains('app-content--workbench'),
    ).toBe(true);
  });

  it('opens and closes the help dialog through its public controls', async () => {
    renderAppShell();

    fireEvent.click(
      screen.getByRole('button', { name: '帮助与快捷键' }),
    );

    await waitFor(() => {
      expect(
        document.querySelector<HTMLElement>(
          '.ant-modal-wrap [role="dialog"]',
        ),
      ).not.toBeNull();
    });
    const dialog = document.querySelector<HTMLElement>(
      '.ant-modal-wrap [role="dialog"]',
    )!;
    const modalRoot = dialog.closest('.ant-modal-root');
    expect(document.querySelector('.app-shell')?.contains(dialog)).toBe(false);
    expect(modalRoot?.parentElement?.parentElement).toBe(document.body);
    expect(dialog.textContent).toContain(
      '准备材料—识别审核—发布图谱—分析评价—教学改进—认证输出',
    );
    const dialogButtons = Array.from(
      dialog.querySelectorAll<HTMLButtonElement>('button'),
    );
    const cancelButton = dialogButtons.find((button) =>
      button.textContent?.includes('取 消'),
    );
    const confirmButton = dialogButtons.find((button) =>
      button.textContent?.includes('知道了'),
    );
    expect(cancelButton?.style.display).toBe('none');
    expect(confirmButton).toBeDefined();

    fireEvent.click(confirmButton!);

    await waitFor(() => {
      expect(dialog.classList.contains('ant-zoom-leave')).toBe(true);
    });
  });

  it('shows the notification empty state and enters governance', async () => {
    const router = renderAppShell();

    fireEvent.click(
      screen.getByRole('button', { name: '通知，0 条' }),
    );

    const dialog = await screen.findByRole('dialog', {
      name: '最近业务通知',
    });
    const drawer = dialog.closest('.ant-drawer');
    expect(document.querySelector('.app-shell')?.contains(dialog)).toBe(false);
    expect(drawer?.parentElement?.parentElement).toBe(document.body);
    expect(drawer?.classList.contains('ant-drawer-open')).toBe(true);
    expect(
      screen.getByText('完成一次运行、审核或提交后，这里会显示通知'),
    ).toBeDefined();

    fireEvent.click(
      screen.getByRole('button', { name: '查看治理中心' }),
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/governance');
    });
    await waitFor(() => {
      expect(drawer?.classList.contains('ant-drawer-open')).toBe(false);
    });
  });

  it('reports all events while rendering only the newest ten', async () => {
    for (let index = 0; index < 12; index += 1) {
      recordWorkflowEvent({
        action: `测试事件 ${index}`,
        actor: '测试用户',
        module: 'M9',
        objectId: `event-${index}`,
        status: 'success',
        summary: `摘要 ${index}`,
      });
    }
    renderAppShell();

    fireEvent.click(
      screen.getByRole('button', { name: '通知，12 条' }),
    );
    await screen.findByRole('dialog', { name: '最近业务通知' });

    expect(document.querySelectorAll('.app-notification-item')).toHaveLength(
      10,
    );
    expect(screen.getByText('测试事件 11')).toBeDefined();
    expect(screen.queryByText('测试事件 1')).toBeNull();
  });
});
