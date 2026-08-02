import { type Mock, vi } from 'vitest';

import type { CreatedScoreImportBatch } from '../../../entities/score-import-batch';
import type { CapturePilotScoreBatchInput } from '../../../features/capture-pilot-score-batch';

export interface TestCapturePilotScoreBatchError extends Error {
  code?: string;
  status?: number;
}

type CapturePilotScoreBatchMock = Mock<
  (
    input: CapturePilotScoreBatchInput,
    context?: unknown,
  ) => Promise<CreatedScoreImportBatch>
>;

interface PilotScoreBatchApiMocks {
  CapturePilotScoreBatchErrorMock: new (
    message?: string,
    options?: { code?: string; status?: number },
  ) => TestCapturePilotScoreBatchError;
  capturePilotScoreBatchMock: CapturePilotScoreBatchMock;
}

const pilotScoreBatchApiMocks = vi.hoisted<PilotScoreBatchApiMocks>(() => ({
  CapturePilotScoreBatchErrorMock: class extends Error {
    code?: string;
    status?: number;

    constructor(
      message?: string,
      options?: { code?: string; status?: number },
    ) {
      super(message);
      this.code = options?.code;
      this.status = options?.status;
    }
  },
  capturePilotScoreBatchMock: vi.fn(),
}));

vi.mock(
  '../../../features/capture-pilot-score-batch/api/capturePilotScoreBatch',
  () => ({
    CapturePilotScoreBatchError:
      pilotScoreBatchApiMocks.CapturePilotScoreBatchErrorMock,
    capturePilotScoreBatch:
      pilotScoreBatchApiMocks.capturePilotScoreBatchMock,
  }),
);

export function getPilotScoreBatchApiMocks() {
  return pilotScoreBatchApiMocks;
}

export function resetPilotScoreBatchApiMock() {
  pilotScoreBatchApiMocks.capturePilotScoreBatchMock.mockReset();
}
