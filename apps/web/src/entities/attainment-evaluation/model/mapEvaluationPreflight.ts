import type { components } from '@engineering-accreditation/api-client';

import type { AttainmentEvaluationPreflight } from './attainmentEvaluation';

type EvaluationPreflightDto =
  components['schemas']['EvaluationPreflightResponse'];

export function mapEvaluationPreflight(
  dto: EvaluationPreflightDto,
): AttainmentEvaluationPreflight {
  return {
    blockedCheckCount: dto.blockedCheckCount,
    blockers: [...dto.blockers],
    checks: dto.checks.map((check) => ({ ...check })),
    evaluationObjectId: dto.evaluationObjectId,
    inputSnapshotHash: dto.inputSnapshotHash,
    missingInputs: dto.missingInputs.map((input) => ({ ...input })),
    passedCheckCount: dto.passedCheckCount,
    reportHash: dto.reportHash,
    reportVersion: dto.reportVersion,
    runId: dto.runId,
    scope: dto.scope,
    status: dto.status,
  };
}
