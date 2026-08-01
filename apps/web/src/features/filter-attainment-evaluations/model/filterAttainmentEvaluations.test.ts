import { describe, expect, it } from 'vitest';

import { prototypeOnlyAttainmentEvaluations } from '../../../entities/attainment-evaluation';
import { filterAttainmentEvaluations } from './filterAttainmentEvaluations';

describe('filterAttainmentEvaluations', () => {
  it('支持按课程、状态和关键词组合筛选', () => {
    const results = filterAttainmentEvaluations(
      prototypeOnlyAttainmentEvaluations,
      {
        course: '单片机基础',
        keyword: '工具',
        status: 'blocked',
      },
    );

    expect(results.map((item) => item.id)).toEqual(['evaluation-mcu-tool']);
  });

  it('关键词可以匹配能力指标编码', () => {
    const results = filterAttainmentEvaluations(
      prototypeOnlyAttainmentEvaluations,
      {
        course: 'all',
        keyword: 'C-05-01',
        status: 'all',
      },
    );

    expect(results.map((item) => item.id)).toEqual(['evaluation-mcu-tool']);
  });
});
