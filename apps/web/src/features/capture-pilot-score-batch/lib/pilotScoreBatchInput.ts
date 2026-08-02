import type { EvaluationInput } from '../../../entities/attainment-evaluation';

export interface PilotScoreBatchFormItem {
  earnedPointsTotal?: string | null;
  observedStudentCount?: number | null;
  possiblePointsTotal?: string | null;
}

export interface PilotScoreBatchItemInput {
  earnedPointsTotal: string;
  inputId: string;
  observedStudentCount: number;
  possiblePointsTotal: string;
}

const decimalInputPattern = /^(?:0|[1-9][0-9]{0,17})(?:\.[0-9]{0,6})?$/;
const canonicalDecimalPattern = /^(?:0|[1-9][0-9]{0,17})(?:\.[0-9]{1,6})?$/;

export function canonicalizeDecimalText(value: unknown): string {
  if (typeof value !== 'string' || !decimalInputPattern.test(value)) {
    throw new Error('请输入不超过 18 位整数、6 位小数的非负数值');
  }
  const [integer, fraction = ''] = value.split('.');
  const canonicalFraction = fraction.replace(/0+$/, '');
  return canonicalFraction ? `${integer}.${canonicalFraction}` : integer!;
}

export function isCanonicalDecimalText(value: string): boolean {
  return (
    canonicalDecimalPattern.test(value) &&
    canonicalizeDecimalText(value) === value
  );
}

function decimalAsScaledInteger(value: string): bigint {
  const [integer, fraction = ''] = value.split('.');
  return BigInt(`${integer}${fraction.padEnd(6, '0')}`);
}

export function compareCanonicalDecimals(left: string, right: string) {
  const leftValue = decimalAsScaledInteger(left);
  const rightValue = decimalAsScaledInteger(right);
  return leftValue === rightValue ? 0 : leftValue < rightValue ? -1 : 1;
}

export function buildPilotScoreBatchItems(
  inputs: EvaluationInput[],
  values: PilotScoreBatchFormItem[],
): PilotScoreBatchItemInput[] {
  if (inputs.length === 0 || values.length !== inputs.length) {
    throw new Error('汇总表单必须覆盖当前运行的全部评分输入');
  }
  return inputs.map((input, index) => {
    const value = values[index];
    const earnedPointsTotal = canonicalizeDecimalText(
      value?.earnedPointsTotal,
    );
    const possiblePointsTotal = canonicalizeDecimalText(
      value?.possiblePointsTotal,
    );
    if (possiblePointsTotal === '0') {
      throw new Error(`${input.label}的应得总分必须大于 0`);
    }
    if (
      compareCanonicalDecimals(earnedPointsTotal, possiblePointsTotal) > 0
    ) {
      throw new Error(`${input.label}的已得总分不能超过应得总分`);
    }
    if (
      !Number.isInteger(value?.observedStudentCount) ||
      (value?.observedStudentCount ?? 0) < 1
    ) {
      throw new Error(`${input.label}的观察学生数必须为正整数`);
    }
    return {
      earnedPointsTotal,
      inputId: input.id,
      observedStudentCount: value!.observedStudentCount!,
      possiblePointsTotal,
    };
  });
}
