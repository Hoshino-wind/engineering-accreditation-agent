import { useQuery } from '@tanstack/react-query';

import { getAttainmentEvaluationPreflight } from '../api/getAttainmentEvaluationPreflight';

export const attainmentEvaluationPreflightQueryKey = (
  runId?: string,
) => ['attainment-evaluation', 'preflight', runId] as const;

export function useAttainmentEvaluationPreflightQuery(
  runId?: string,
  enabled = true,
) {
  const requestedRunId = runId || undefined;

  return useQuery({
    enabled: enabled && Boolean(requestedRunId),
    queryFn: () =>
      getAttainmentEvaluationPreflight(requestedRunId!),
    queryKey: attainmentEvaluationPreflightQueryKey(requestedRunId),
    retry: false,
  });
}
