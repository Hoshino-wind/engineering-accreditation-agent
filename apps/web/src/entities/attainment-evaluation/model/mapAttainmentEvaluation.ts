import type { components } from '@engineering-accreditation/api-client';

import type {
  AttainmentCalculation,
  AttainmentEvaluationItem,
  AttainmentEvaluationSummary,
  EvaluationApprovalStatus,
  EvaluationItemStatus,
} from './attainmentEvaluation';

type EvaluationResultDto =
  components['schemas']['EvaluationResultResponse'];
type EvaluationSummaryDto =
  components['schemas']['EvaluationObjectSummaryResponse'];
type EvaluationRunDto =
  components['schemas']['EvaluationRunDetailResponse'];

function mapOutcome(
  outcome: EvaluationResultDto['outcome'],
) {
  return outcome === 'not_achieved' ? 'not-achieved' : 'achieved';
}

export function deriveEvaluationItemStatus({
  approvalStatus,
  outcome,
  readinessStatus,
}: {
  approvalStatus: EvaluationApprovalStatus;
  outcome?: 'achieved' | 'not-achieved';
  readinessStatus: 'ready' | 'blocked';
}): EvaluationItemStatus {
  if (readinessStatus === 'blocked') {
    return 'blocked';
  }
  if (outcome === 'not-achieved') {
    return 'not-achieved';
  }
  if (approvalStatus === 'approved') {
    return 'approved';
  }
  return 'awaiting-review';
}

export function mapEvaluationSummary(
  dto: EvaluationSummaryDto,
): AttainmentEvaluationSummary {
  const outcome = dto.result
    ? mapOutcome(dto.result.outcome)
    : undefined;
  return {
    abilityCode: dto.abilityCode,
    abilityName: dto.abilityName,
    approvalStatus: dto.approvalStatus,
    course: dto.course,
    id: dto.evaluationObjectId,
    objectiveCode: dto.objectiveCode,
    objectiveName: dto.objectiveName,
    outcome,
    presentedRunId: dto.presentedRunId,
    readinessStatus: dto.readinessStatus,
    score: dto.result?.score,
    status: deriveEvaluationItemStatus({
      approvalStatus: dto.approvalStatus,
      outcome,
      readinessStatus: dto.readinessStatus,
    }),
  };
}

function mapCalculation(
  dto: EvaluationRunDto['calculation'],
): AttainmentCalculation {
  return {
    blockers: dto.blockers,
    contributions: dto.contributions.map((contribution) => ({
      input: {
        ...contribution.input,
        scoreRate: contribution.input.scoreRate ?? undefined,
      },
      value: contribution.value ?? undefined,
    })),
    outcome: dto.result
      ? mapOutcome(dto.result.outcome)
      : undefined,
    ready: dto.ready,
    score: dto.result?.score,
    weightTotal: dto.weightTotal,
  };
}

export function mapEvaluationRun(
  dto: EvaluationRunDto,
): AttainmentEvaluationItem {
  const calculation = mapCalculation(dto.calculation);
  const readinessStatus = calculation.ready ? 'ready' : 'blocked';
  return {
    abilityCode: dto.evaluationObject.abilityCode,
    abilityName: dto.evaluationObject.abilityName,
    approvalStatus: dto.approvalStatus,
    calculation,
    course: dto.evaluationObject.course,
    evidence: dto.evidence,
    graphVersion: dto.graphVersion,
    id: dto.evaluationObject.evaluationObjectId,
    inputSnapshot: dto.inputSnapshot,
    inputs: dto.inputs.map((input) => ({
      ...input,
      scoreRate: input.scoreRate ?? undefined,
    })),
    objectiveCode: dto.evaluationObject.objectiveCode,
    objectiveName: dto.evaluationObject.objectiveName,
    policyVersion: dto.policyVersion,
    programVersion: dto.programVersion,
    readinessChecks: dto.readinessChecks,
    readinessStatus,
    runId: dto.runId,
    sourceRunId: dto.sourceRunId ?? undefined,
    scoreSnapshot: dto.scoreSnapshot,
    status: deriveEvaluationItemStatus({
      approvalStatus: dto.approvalStatus,
      outcome: calculation.outcome,
      readinessStatus,
    }),
    studentCount: dto.studentCount,
    threshold: dto.threshold,
  };
}
