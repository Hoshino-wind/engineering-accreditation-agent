import { useQuery } from '@tanstack/react-query';

import { getAttainmentEvaluationObjects } from '../api/getAttainmentEvaluationObjects';

export const attainmentEvaluationObjectsQueryKey = [
  'attainment-evaluation',
  'objects',
] as const;

export function useAttainmentEvaluationObjectsQuery(enabled = true) {
  return useQuery({
    enabled,
    queryFn: getAttainmentEvaluationObjects,
    queryKey: attainmentEvaluationObjectsQueryKey,
    retry: false,
  });
}
