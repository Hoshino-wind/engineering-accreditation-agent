import { useMutation } from '@tanstack/react-query';

import type { CreatedScoreImportBatch } from '../../../entities/score-import-batch';
import {
  capturePilotScoreBatch,
  type CapturePilotScoreBatchError,
  type CapturePilotScoreBatchInput,
} from '../api/capturePilotScoreBatch';

export type { CapturePilotScoreBatchInput } from '../api/capturePilotScoreBatch';

export function useCapturePilotScoreBatch() {
  return useMutation<
    CreatedScoreImportBatch,
    CapturePilotScoreBatchError,
    CapturePilotScoreBatchInput
  >({
    mutationFn: capturePilotScoreBatch,
    retry: false,
    scope: { id: 'pilot-score-batch-capture' },
  });
}
