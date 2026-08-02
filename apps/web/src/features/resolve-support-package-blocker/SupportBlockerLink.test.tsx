import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntdApp } from 'antd';
import {
  afterEach,
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

import {
  getAttainmentEvaluationObjects,
  getAttainmentEvaluationRunReference,
  type AttainmentEvaluationObjectList,
  type AttainmentEvaluationRunReference,
} from '../../entities/attainment-evaluation';
import { SupportBlockerLink } from './index';

vi.mock(
  '../../entities/attainment-evaluation/api/getAttainmentEvaluationObjects',
  () => ({
    getAttainmentEvaluationObjects: vi.fn(),
  }),
);
vi.mock(
  '../../entities/attainment-evaluation/api/getAttainmentEvaluationRunReference',
  () => ({
    getAttainmentEvaluationRunReference: vi.fn(),
  }),
);

const evaluationObjects: AttainmentEvaluationObjectList = {
  items: [
    {
      abilityCode: 'CT-6',
      abilityName: '工程问题分析',
      approvalStatus: 'pending',
      course: '软件工程综合实践',
      id: 'evaluation-ct6',
      objectiveCode: 'CO-4',
      objectiveName: '复杂工程问题分析',
      outcome: 'not-achieved',
      presentedRunId: 'eval-2026-071',
      readinessStatus: 'ready',
      score: 0.68,
      status: 'not-achieved',
    },
  ],
  total: 1,
};

const getEvaluationObjectsMock = vi.mocked(
  getAttainmentEvaluationObjects,
);
const getEvaluationRunReferenceMock = vi.mocked(
  getAttainmentEvaluationRunReference,
);

beforeEach(() => {
  getEvaluationObjectsMock.mockReset();
  getEvaluationObjectsMock.mockResolvedValue(evaluationObjects);
  getEvaluationRunReferenceMock.mockReset();
});

afterEach(cleanup);

function renderLink(
  module: 'M6' | 'M7',
  sourceObjectId?: string,
) {
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
        path: '*',
        element: (
          <SupportBlockerLink
            module={module}
            sourceObjectId={sourceObjectId}
          />
        ),
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
  return router;
}

describe('SupportBlockerLink public behavior', () => {
  it('opens the M6 module without requesting when no run ID is provided', async () => {
    const router = renderLink('M6');

    fireEvent.click(
      screen.getByRole('button', { name: '打开 M6' }),
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/evaluations');
      expect(router.state.location.search).toBe('');
    });
    expect(getEvaluationObjectsMock).not.toHaveBeenCalled();
    expect(getEvaluationRunReferenceMock).not.toHaveBeenCalled();
  });

  it('opens the exact M7 improvement case without resolving M6', async () => {
    const router = renderLink('M7', 'qi-2026-017');

    fireEvent.click(
      screen.getByRole('button', { name: '返回 M7' }),
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/improvements');
      expect(router.state.location.search).toBe(
        '?case=qi-2026-017',
      );
    });
    expect(getEvaluationObjectsMock).not.toHaveBeenCalled();
    expect(getEvaluationRunReferenceMock).not.toHaveBeenCalled();
  });

  it('keeps M6 disabled until the authoritative reference is ready', async () => {
    let finishRequest:
      | ((value: AttainmentEvaluationRunReference) => void)
      | undefined;
    getEvaluationRunReferenceMock.mockReturnValue(
      new Promise((resolve) => {
        finishRequest = resolve;
      }),
    );
    renderLink('M6', 'eval-2026-071');

    const button = screen.getByText('返回 M6').closest('button');
    expect(button).not.toBeNull();
    expect(button?.disabled).toBe(true);

    await act(async () => {
      finishRequest?.({
        evaluationObjectId: 'evaluation-ct6',
        runId: 'eval-2026-071',
      });
      await Promise.resolve();
    });

    await waitFor(() => expect(button?.disabled).toBe(false));
  });

  it('keeps M6 disabled until the authoritative object list is ready', async () => {
    let finishRequest:
      | ((value: AttainmentEvaluationObjectList) => void)
      | undefined;
    getEvaluationRunReferenceMock.mockResolvedValue({
      evaluationObjectId: 'evaluation-ct6',
      runId: 'eval-2026-071',
    });
    getEvaluationObjectsMock.mockReturnValue(
      new Promise((resolve) => {
        finishRequest = resolve;
      }),
    );
    renderLink('M6', 'eval-2026-071');

    const button = screen.getByText('返回 M6').closest('button');
    expect(button).not.toBeNull();
    expect(button?.disabled).toBe(true);

    await act(async () => {
      finishRequest?.(evaluationObjects);
      await Promise.resolve();
    });

    await waitFor(() => expect(button?.disabled).toBe(false));
  });

  it('opens the exact M6 evaluation object and run for a known run ID', async () => {
    getEvaluationRunReferenceMock.mockResolvedValue({
      evaluationObjectId: 'evaluation-ct6',
      runId: 'eval-2026-071',
    });
    const router = renderLink('M6', 'eval-2026-071');

    const button = (await screen.findByText('返回 M6')).closest(
      'button',
    );
    expect(button).not.toBeNull();
    await waitFor(() =>
      expect(button?.disabled).toBe(false),
    );
    fireEvent.click(button!);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/evaluations');
      expect(router.state.location.search).toBe(
        '?evaluation=evaluation-ct6&run=eval-2026-071',
      );
    });
  });

  it('passes an opaque M6 run ID without trimming it', async () => {
    getEvaluationRunReferenceMock.mockResolvedValue(null);
    renderLink('M6', ' eval-2026-071 ');

    await waitFor(() => {
      expect(getEvaluationRunReferenceMock).toHaveBeenCalledWith(
        ' eval-2026-071 ',
      );
    });
  });
});
