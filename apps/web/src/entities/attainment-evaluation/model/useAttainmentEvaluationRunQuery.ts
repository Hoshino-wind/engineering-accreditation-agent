import { useQuery } from '@tanstack/react-query';

import { getAttainmentEvaluationRun } from '../api/getAttainmentEvaluationRun';

export const attainmentEvaluationRunQueryKey = (
  runId?: string,
) => ['attainment-evaluation', 'run', runId] as const;

export function useAttainmentEvaluationRunQuery(
  runId?: string,
  enabled = true,
) {
  const requestedRunId = runId || undefined;
  return useQuery({
    enabled: enabled && Boolean(requestedRunId),
    queryFn: () => getAttainmentEvaluationRun(requestedRunId!),
    queryKey: attainmentEvaluationRunQueryKey(requestedRunId),
    retry: false,
  });
}
