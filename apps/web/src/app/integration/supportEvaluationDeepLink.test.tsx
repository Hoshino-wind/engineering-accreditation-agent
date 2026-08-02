import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
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
import {
  createMemoryRouter,
  RouterProvider,
} from 'react-router';

import { AttainmentEvaluationPage } from '../../views/evaluations';
import { AccreditationSupportPage } from '../../views/support';
import {
  getAttainmentEvaluationObjects,
  getAttainmentEvaluationRun,
  getAttainmentEvaluationRunReference,
} from '../../entities/attainment-evaluation';
import {
  attainmentEvaluationObjectListFixture,
  attainmentEvaluationRunFixtures,
} from '../../entities/attainment-evaluation/testing';

vi.mock(
  '../../entities/attainment-evaluation/api/getAttainmentEvaluationRunReference',
  () => ({
    getAttainmentEvaluationRunReference: vi.fn(),
  }),
);
vi.mock(
  '../../entities/attainment-evaluation/api/getAttainmentEvaluationObjects',
  () => ({
    getAttainmentEvaluationObjects: vi.fn(),
  }),
);
vi.mock(
  '../../entities/attainment-evaluation/api/getAttainmentEvaluationRun',
  () => ({
    getAttainmentEvaluationRun: vi.fn(),
  }),
);

const getEvaluationRunReferenceMock = vi.mocked(
  getAttainmentEvaluationRunReference,
);
const getEvaluationObjectsMock = vi.mocked(
  getAttainmentEvaluationObjects,
);
const getEvaluationRunMock = vi.mocked(
  getAttainmentEvaluationRun,
);

beforeAll(() => {
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
});

afterAll(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  window.localStorage.clear();
  getEvaluationRunReferenceMock.mockResolvedValue({
    evaluationObjectId: 'evaluation-ct6',
    runId: 'eval-2026-071',
  });
  getEvaluationObjectsMock.mockResolvedValue(
    attainmentEvaluationObjectListFixture,
  );
  getEvaluationRunMock.mockImplementation(
    (runId) =>
      Promise.resolve(
        attainmentEvaluationRunFixtures[runId] ?? null,
      ),
  );
});

afterEach(cleanup);

describe('support-to-evaluation deep link', () => {
  it('opens the exact M6 evaluation object from the blocked support package', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    const router = createMemoryRouter(
      [
        {
          path: '/support',
          element: <AccreditationSupportPage />,
        },
        {
          path: '/evaluations',
          element: <AttainmentEvaluationPage />,
        },
      ],
      { initialEntries: ['/support'] },
    );

    render(
      <AntdApp>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </AntdApp>,
    );

    let returnToEvaluationButton:
      | HTMLButtonElement
      | undefined;
    await waitFor(() => {
      returnToEvaluationButton = Array.from(
        document.querySelectorAll<HTMLButtonElement>('button'),
      ).find(
        (button) =>
          button.textContent?.trim() === '返回 M6' &&
          !button.disabled,
      );
      expect(returnToEvaluationButton).toBeDefined();
    });
    fireEvent.click(returnToEvaluationButton!);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/evaluations');
      expect(router.state.location.search).toBe(
        '?evaluation=evaluation-ct6&run=eval-2026-071',
      );
      expect(
        document.querySelector<HTMLTableRowElement>(
          'tr[aria-selected="true"]',
        )?.textContent,
      ).toContain('CT-6');
      expect(document.body.textContent).toContain('工程规范与伦理');
    });
  });
});
