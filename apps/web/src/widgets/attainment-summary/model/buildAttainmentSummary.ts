import type { AttainmentEvaluationSummary } from '../../../entities/attainment-evaluation';

export function buildAttainmentSummary(
  evaluations: AttainmentEvaluationSummary[],
) {
  const readyCount = evaluations.filter(
    (evaluation) => evaluation.readinessStatus === 'ready',
  ).length;
  return {
    achievedCount: evaluations.filter(
      (evaluation) => evaluation.outcome === 'achieved',
    ).length,
    blockedCount: evaluations.length - readyCount,
    readyCount,
    totalCount: evaluations.length,
  };
}
