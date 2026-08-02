import type {
  AttainmentEvaluationItem,
  EvaluationInput,
} from '../../../entities/attainment-evaluation';
import type { PilotScoreBatchFormItem } from '../lib/pilotScoreBatchInput';

export interface CapturePilotScoreBatchIntent {
  baseRunId: string;
  evaluationObjectId: string;
  evaluationTitle: string;
  idempotencyKey: string;
  inputSnapshotHash: string;
  inputs: EvaluationInput[];
  studentCount: number;
}

export interface PilotScoreBatchFormValues {
  confirmedAggregateOnly?: boolean;
  items: PilotScoreBatchFormItem[];
}

function createIdempotencyKey() {
  if (typeof globalThis.crypto.randomUUID === 'function') {
    return `m6-pilot-score:${globalThis.crypto.randomUUID()}`;
  }
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  return `m6-pilot-score:${hex}`;
}

export function createPilotScoreBatchIntent(
  evaluation: AttainmentEvaluationItem,
): CapturePilotScoreBatchIntent {
  return {
    baseRunId: evaluation.runId,
    evaluationObjectId: evaluation.id,
    evaluationTitle: `${evaluation.objectiveCode} ${evaluation.objectiveName}`,
    idempotencyKey: createIdempotencyKey(),
    inputSnapshotHash: evaluation.inputSnapshot.hash,
    inputs: evaluation.inputs.map((input) => ({ ...input })),
    studentCount: evaluation.studentCount,
  };
}

export function createPilotScoreBatchInitialValues(
  intent: CapturePilotScoreBatchIntent,
): PilotScoreBatchFormValues {
  return {
    confirmedAggregateOnly: false,
    items: intent.inputs.map(() => ({
      earnedPointsTotal: undefined,
      observedStudentCount: intent.studentCount,
      possiblePointsTotal: undefined,
    })),
  };
}
