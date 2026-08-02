import {
  act,
  renderHook,
  waitFor,
} from '@testing-library/react';
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { getAttainmentEvaluationRun } from '../api/getAttainmentEvaluationRun';
import type { AttainmentEvaluationItem } from './attainmentEvaluation';
import { useAttainmentEvaluationRunQuery } from './useAttainmentEvaluationRunQuery';
import { attainmentEvaluationRunFixtures } from '../testing/attainmentEvaluationFixtures';

vi.mock('../api/getAttainmentEvaluationRun', () => ({
  getAttainmentEvaluationRun: vi.fn(),
}));

const getEvaluationRunMock = vi.mocked(
  getAttainmentEvaluationRun,
);

beforeEach(() => {
  getEvaluationRunMock.mockReset();
});

describe('useAttainmentEvaluationRunQuery', () => {
  it('keeps a late previous response out of the selected run', async () => {
    const pendingRequests = new Map<
      string,
      (value: AttainmentEvaluationItem) => void
    >();
    getEvaluationRunMock.mockImplementation(
      (runId) =>
        new Promise((resolve) => {
          pendingRequests.set(runId, resolve);
        }),
    );
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
    const { rerender, result } = renderHook(
      ({ runId }) => useAttainmentEvaluationRunQuery(runId),
      {
        initialProps: { runId: 'eval-2026-066' },
        wrapper,
      },
    );

    rerender({ runId: 'eval-2026-071' });
    await act(async () => {
      pendingRequests.get('eval-2026-071')?.(
        attainmentEvaluationRunFixtures['eval-2026-071']!,
      );
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(result.current.data?.runId).toBe('eval-2026-071');
    });

    await act(async () => {
      pendingRequests.get('eval-2026-066')?.(
        attainmentEvaluationRunFixtures['eval-2026-066']!,
      );
      await Promise.resolve();
    });
    expect(result.current.data?.runId).toBe('eval-2026-071');
  });
});
