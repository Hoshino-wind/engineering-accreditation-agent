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
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getAttainmentEvaluationPreflight } from '../api/getAttainmentEvaluationPreflight';
import { attainmentEvaluationPreflightFixtures } from '../testing/attainmentEvaluationPreflightFixtures';
import type { AttainmentEvaluationPreflight } from './attainmentEvaluation';
import { useAttainmentEvaluationPreflightQuery } from './useAttainmentEvaluationPreflightQuery';

vi.mock('../api/getAttainmentEvaluationPreflight', () => ({
  getAttainmentEvaluationPreflight: vi.fn(),
}));

const getEvaluationPreflightMock = vi.mocked(
  getAttainmentEvaluationPreflight,
);

beforeEach(() => {
  getEvaluationPreflightMock.mockReset();
});

describe('useAttainmentEvaluationPreflightQuery', () => {
  it('keeps a late previous response out of the selected run report', async () => {
    const pendingRequests = new Map<
      string,
      (value: AttainmentEvaluationPreflight) => void
    >();
    getEvaluationPreflightMock.mockImplementation(
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
      ({ runId }) =>
        useAttainmentEvaluationPreflightQuery(runId),
      {
        initialProps: { runId: 'eval-2026-068' },
        wrapper,
      },
    );

    rerender({ runId: 'eval-2026-070' });
    await act(async () => {
      pendingRequests.get('eval-2026-070')?.(
        attainmentEvaluationPreflightFixtures['eval-2026-070']!,
      );
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(result.current.data?.runId).toBe('eval-2026-070');
    });

    await act(async () => {
      pendingRequests.get('eval-2026-068')?.(
        attainmentEvaluationPreflightFixtures['eval-2026-068']!,
      );
      await Promise.resolve();
    });
    expect(result.current.data?.runId).toBe('eval-2026-070');
  });

  it('does not request a report until the caller enables it', () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(
      () =>
        useAttainmentEvaluationPreflightQuery(
          'eval-2026-068',
          false,
        ),
      { wrapper },
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(getEvaluationPreflightMock).not.toHaveBeenCalled();
  });
});
