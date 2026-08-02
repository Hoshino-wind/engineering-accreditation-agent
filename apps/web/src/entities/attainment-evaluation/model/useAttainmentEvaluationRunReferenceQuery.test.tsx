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

import { getAttainmentEvaluationRunReference } from '../api/getAttainmentEvaluationRunReference';
import type { AttainmentEvaluationRunReference } from './attainmentEvaluation';
import { useAttainmentEvaluationRunReferenceQuery } from './useAttainmentEvaluationRunReferenceQuery';

vi.mock(
  '../api/getAttainmentEvaluationRunReference',
  () => ({
    getAttainmentEvaluationRunReference: vi.fn(),
  }),
);

const getEvaluationRunReferenceMock = vi.mocked(
  getAttainmentEvaluationRunReference,
);

beforeEach(() => {
  getEvaluationRunReferenceMock.mockReset();
});

describe('useAttainmentEvaluationRunReferenceQuery', () => {
  it('keeps a late response from a previous run out of the current target', async () => {
    const pendingRequests = new Map<
      string,
      (value: AttainmentEvaluationRunReference) => void
    >();
    getEvaluationRunReferenceMock.mockImplementation(
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
        useAttainmentEvaluationRunReferenceQuery(runId),
      {
        initialProps: { runId: 'eval-run-a' },
        wrapper,
      },
    );

    rerender({ runId: 'eval-run-b' });
    await act(async () => {
      pendingRequests.get('eval-run-b')?.({
        evaluationObjectId: 'evaluation-ct6',
        runId: 'eval-run-b',
      });
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(result.current.data?.runId).toBe('eval-run-b');
    });

    await act(async () => {
      pendingRequests.get('eval-run-a')?.({
        evaluationObjectId: 'evaluation-ct3',
        runId: 'eval-run-a',
      });
      await Promise.resolve();
    });
    expect(result.current.data?.runId).toBe('eval-run-b');
  });
});
