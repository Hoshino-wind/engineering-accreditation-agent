import { describe, expect, it } from 'vitest';

import {
  buildPilotScoreBatchItems,
  canonicalizeDecimalText,
  isCanonicalDecimalText,
} from './pilotScoreBatchInput';

const inputs = [
  {
    evidenceName: '课程评分汇总',
    id: 'input-primary',
    label: '主要评价输入',
    weight: 1,
  },
];

describe('pilotScoreBatchInput', () => {
  it('canonicalizes totals without converting through JavaScript numbers', () => {
    expect(canonicalizeDecimalText('420.000000')).toBe('420');
    expect(canonicalizeDecimalText('0.250000')).toBe('0.25');
    expect(isCanonicalDecimalText('0.25')).toBe(true);
    expect(isCanonicalDecimalText('0.250000')).toBe(false);
  });

  it('builds exact aggregate items for every evaluation input', () => {
    expect(
      buildPilotScoreBatchItems(inputs, [
        {
          earnedPointsTotal: '321.500000',
          observedStudentCount: 42,
          possiblePointsTotal: '420.0',
        },
      ]),
    ).toEqual([
      {
        earnedPointsTotal: '321.5',
        inputId: 'input-primary',
        observedStudentCount: 42,
        possiblePointsTotal: '420',
      },
    ]);
  });

  it('rejects incomplete, invalid, or over-earned aggregate values', () => {
    expect(() => buildPilotScoreBatchItems(inputs, [])).toThrow(
      '必须覆盖当前运行的全部评分输入',
    );
    expect(() =>
      buildPilotScoreBatchItems(inputs, [
        {
          earnedPointsTotal: '421',
          observedStudentCount: 42,
          possiblePointsTotal: '420',
        },
      ]),
    ).toThrow('已得总分不能超过应得总分');
    expect(() => canonicalizeDecimalText('1e2')).toThrow(
      '请输入不超过 18 位整数',
    );
  });
});
