import { useQuery } from '@tanstack/react-query';

import { getAttainmentEvaluationRunReference } from '../api/getAttainmentEvaluationRunReference';

export const attainmentEvaluationRunReferenceQueryKey = (
  runId?: string,
) => ['attainment-evaluation', 'run-reference', runId] as const;

export function useAttainmentEvaluationRunReferenceQuery(
  runId?: string,
  enabled = true,
) {
  const requestedRunId = runId || undefined;

  return useQuery({
    enabled: enabled && Boolean(requestedRunId),
    queryFn: () => getAttainmentEvaluationRunReference(requestedRunId!),
    queryKey: attainmentEvaluationRunReferenceQueryKey(requestedRunId),
    retry: false,
  });
}
