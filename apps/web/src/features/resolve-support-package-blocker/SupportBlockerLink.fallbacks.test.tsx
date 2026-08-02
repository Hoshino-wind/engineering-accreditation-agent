import {
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

function renderLink(sourceObjectId: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <SupportBlockerLink
            module="M6"
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

describe('SupportBlockerLink fallback behavior', () => {
  it('uses a module-level fallback for an unknown run', async () => {
    getEvaluationRunReferenceMock.mockResolvedValue(null);
    const router = renderLink('eval-unknown');

    const button = (await screen.findByText('打开 M6')).closest(
      'button',
    );
    expect(button).not.toBeNull();
    fireEvent.click(button!);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/evaluations');
      expect(router.state.location.search).toBe('');
      expect(
        screen.queryByText(
          '未找到该评价运行，已打开 M6 评价对象列表',
        ),
      ).not.toBeNull();
    });
  });

  it('distinguishes a service failure from an unknown run', async () => {
    getEvaluationRunReferenceMock.mockRejectedValue(
      new Error('service unavailable'),
    );
    const router = renderLink('eval-2026-071');

    const button = (await screen.findByText('打开 M6')).closest(
      'button',
    );
    expect(button).not.toBeNull();
    fireEvent.click(button!);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/evaluations');
      expect(
        screen.queryByText(
          '评价运行定位服务暂不可用，已打开 M6 评价对象列表',
        ),
      ).not.toBeNull();
    });
  });

  it('uses the service fallback when the authoritative object list fails', async () => {
    getEvaluationRunReferenceMock.mockResolvedValue({
      evaluationObjectId: 'evaluation-ct6',
      runId: 'eval-2026-071',
    });
    getEvaluationObjectsMock.mockRejectedValue(
      new Error('service unavailable'),
    );
    const router = renderLink('eval-2026-071');

    const button = (await screen.findByText('打开 M6')).closest(
      'button',
    );
    expect(button).not.toBeNull();
    fireEvent.click(button!);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/evaluations');
      expect(
        screen.queryByText(
          '评价运行定位服务暂不可用，已打开 M6 评价对象列表',
        ),
      ).not.toBeNull();
    });
  });

  it('does not deep-link to an object missing from the current M6 dataset', async () => {
    getEvaluationRunReferenceMock.mockResolvedValue({
      evaluationObjectId: 'evaluation-not-loaded',
      runId: 'eval-2026-072',
    });
    const router = renderLink('eval-2026-072');

    const button = (await screen.findByText('打开 M6')).closest(
      'button',
    );
    expect(button).not.toBeNull();
    fireEvent.click(button!);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/evaluations');
      expect(router.state.location.search).toBe('');
      expect(
        screen.queryByText(
          '对应评价对象尚未载入当前工作台，已打开 M6 评价对象列表',
        ),
      ).not.toBeNull();
    });
  });

  it('deep-links to an exact historical run when its object is available', async () => {
    getEvaluationRunReferenceMock.mockResolvedValue({
      evaluationObjectId: 'evaluation-ct6',
      runId: 'eval-2026-072',
    });
    const router = renderLink('eval-2026-072');

    const button = (await screen.findByText('返回 M6')).closest(
      'button',
    );
    expect(button).not.toBeNull();
    await waitFor(() => expect(button?.disabled).toBe(false));
    fireEvent.click(button!);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/evaluations');
      expect(router.state.location.search).toBe(
        '?evaluation=evaluation-ct6&run=eval-2026-072',
      );
    });
  });
});
