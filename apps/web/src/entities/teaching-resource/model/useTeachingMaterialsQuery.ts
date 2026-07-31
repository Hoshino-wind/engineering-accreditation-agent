import { useQuery } from '@tanstack/react-query';

import { getTeachingMaterials } from '../api/getTeachingMaterials';

export const teachingMaterialsQueryKey = ['teaching-materials'] as const;

export function useTeachingMaterialsQuery() {
  return useQuery({
    queryKey: teachingMaterialsQueryKey,
    queryFn: getTeachingMaterials,
    refetchInterval: (query) =>
      query.state.data?.some((item) => item.status === 'processing')
        ? 2_000
        : false,
  });
}
