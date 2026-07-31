import { useMutation, useQueryClient } from '@tanstack/react-query';

import { teachingMaterialsQueryKey } from '../../../entities/teaching-resource';
import { uploadTeachingMaterial } from '../api/uploadTeachingMaterial';

export function useUploadTeachingMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadTeachingMaterial,
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: teachingMaterialsQueryKey,
      });
    },
  });
}
