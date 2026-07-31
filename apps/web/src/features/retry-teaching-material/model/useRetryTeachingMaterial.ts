import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  retryTeachingMaterial,
  teachingMaterialsQueryKey,
} from '../../../entities/teaching-resource';

export function useRetryTeachingMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: retryTeachingMaterial,
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: teachingMaterialsQueryKey,
      });
    },
  });
}
