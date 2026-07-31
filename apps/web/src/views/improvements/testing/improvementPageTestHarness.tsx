import { render } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import { vi } from 'vitest';
import {
  createMemoryRouter,
  RouterProvider,
} from 'react-router';

import { TeachingImprovementPage } from '../index';

export function installImprovementPageTestEnvironment() {
  const getComputedStyle = window.getComputedStyle.bind(window);
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element) =>
    getComputedStyle(element),
  );
  vi.stubGlobal(
    'ResizeObserver',
    class {
      disconnect() {}
      observe() {}
      unobserve() {}
    },
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
}

export function restoreImprovementPageTestEnvironment() {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
}

export function renderImprovementPage(initialEntry: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/improvements',
        element: <TeachingImprovementPage />,
      },
    ],
    { initialEntries: [initialEntry] },
  );

  render(
    <AntdApp>
      <RouterProvider router={router} />
    </AntdApp>,
  );
  return router;
}

export function getSelectedCaseRow() {
  return document.querySelector<HTMLTableRowElement>(
    'tr[aria-selected="true"]',
  );
}

export function getCaseRow(text: string) {
  return Array.from(
    document.querySelectorAll<HTMLTableRowElement>('tbody tr'),
  ).find((row) => row.textContent?.includes(text));
}
