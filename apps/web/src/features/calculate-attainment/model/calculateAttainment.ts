import type {
  AttainmentCalculation,
  AttainmentEvaluationItem,
} from '../../../entities/attainment-evaluation';

const precision = 1000;

function roundToThree(value: number) {
  return Math.round(value * precision) / precision;
}

export function calculateAttainment(
  evaluation: AttainmentEvaluationItem,
): AttainmentCalculation {
  const contributions = evaluation.inputs.map((input) => ({
    input,
    value:
      input.scoreRate === undefined
        ? undefined
        : roundToThree(input.scoreRate * input.weight),
  }));
  const weightTotal = roundToThree(
    evaluation.inputs.reduce((total, input) => total + input.weight, 0),
  );
  const blockers = new Set(
    evaluation.readinessChecks
      .filter((check) => check.status === 'blocked')
      .map((check) => check.detail),
  );

  evaluation.inputs.forEach((input) => {
    if (input.scoreRate === undefined) {
      blockers.add(`${input.label}缺少有效得分率`);
    }
  });

  // 正式评价要求权重精确闭合，不能通过前端显示值掩盖输入错误。
  if (Math.abs(weightTotal - 1) > 0.0001) {
    blockers.add(`评分项权重合计为 ${weightTotal}，必须等于 1`);
  }

  const blockerList = Array.from(blockers);
  const ready = blockerList.length === 0;
  const score = ready
    ? roundToThree(
        contributions.reduce(
          (total, contribution) => total + (contribution.value ?? 0),
          0,
        ),
      )
    : undefined;
  const outcome =
    score === undefined
      ? 'blocked'
      : score >= evaluation.threshold
        ? 'achieved'
        : 'not-achieved';

  return {
    blockers: blockerList,
    contributions,
    outcome,
    ready,
    score,
    weightTotal,
  };
}
