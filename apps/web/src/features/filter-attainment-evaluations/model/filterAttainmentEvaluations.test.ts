import { describe, expect, it } from 'vitest';

import { prototypeOnlyAttainmentEvaluations } from '../../../entities/attainment-evaluation';
import { filterAttainmentEvaluations } from './filterAttainmentEvaluations';

describe('filterAttainmentEvaluations', () => {
  it('支持按课程、状态和关键词组合筛选', () => {
    const results = filterAttainmentEvaluations(
      prototypeOnlyAttainmentEvaluations,
      {
        course: '软件工程',
        keyword: '团队',
        status: 'blocked',
      },
    );

    expect(results.map((item) => item.id)).toEqual(['evaluation-ct5']);
  });

  it('关键词可以匹配能力编码', () => {
    const results = filterAttainmentEvaluations(
      prototypeOnlyAttainmentEvaluations,
      {
        course: 'all',
        keyword: 'BA-2',
        status: 'all',
      },
    );

    expect(results.map((item) => item.id)).toEqual(['evaluation-ct3']);
  });
});
