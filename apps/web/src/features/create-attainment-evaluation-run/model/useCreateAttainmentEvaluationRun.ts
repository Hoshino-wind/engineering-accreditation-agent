import { useMutation, useQueryClient } from '@tanstack/react-query';

import { attainmentEvaluationRunQueryKey } from '../../../entities/attainment-evaluation';
import {
  createAttainmentEvaluationRun,
  type CreateAttainmentEvaluationRunInput,
  type CreateAttainmentEvaluationRunError,
  type CreatedAttainmentEvaluationRun,
} from '../api/createAttainmentEvaluationRun';

export function useCreateAttainmentEvaluationRun() {
  const queryClient = useQueryClient();

  return useMutation<
    CreatedAttainmentEvaluationRun,
    CreateAttainmentEvaluationRunError,
    CreateAttainmentEvaluationRunInput
  >({
    mutationFn: createAttainmentEvaluationRun,
    onSuccess: (created) => {
      queryClient.setQueryData(
        attainmentEvaluationRunQueryKey(created.run.runId),
        created.run,
      );
    },
    retry: false,
    scope: { id: 'attainment-evaluation-run-create' },
  });
}
