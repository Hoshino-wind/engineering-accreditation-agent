import { useQuery } from '@tanstack/react-query';

import { getSystemStatus } from '../api/getSystemStatus';

export const systemStatusQueryKey = ['system', 'status'] as const;

export function useSystemStatusQuery() {
  return useQuery({
    queryKey: systemStatusQueryKey,
    queryFn: getSystemStatus,
    refetchInterval: 60_000,
  });
}
