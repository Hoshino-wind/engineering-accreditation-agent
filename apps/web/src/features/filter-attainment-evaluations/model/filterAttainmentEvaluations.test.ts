import { describe, expect, it } from 'vitest';

import type { AttainmentEvaluationSummary } from '../../../entities/attainment-evaluation';
import { filterAttainmentEvaluations } from './filterAttainmentEvaluations';

const evaluations: AttainmentEvaluationSummary[] = [
  {
    abilityCode: 'BA-2',
    abilityName: '算法分析与设计能力',
    approvalStatus: 'pending',
    course: '数据结构',
    id: 'evaluation-ct3',
    objectiveCode: 'CT-3',
    objectiveName: '算法设计正确性',
    outcome: 'achieved',
    presentedRunId: 'eval-2026-066',
    readinessStatus: 'ready',
    score: 0.82,
    status: 'awaiting-review',
  },
  {
    abilityCode: 'BA-6',
    abilityName: '团队协作与沟通能力',
    approvalStatus: 'not_submitted',
    course: '软件工程',
    id: 'evaluation-ct5',
    objectiveCode: 'CT-5',
    objectiveName: '团队协作与沟通能力',
    presentedRunId: 'eval-2026-068',
    readinessStatus: 'blocked',
    status: 'blocked',
  },
];

describe('filterAttainmentEvaluations', () => {
  it('支持按课程、状态和关键词组合筛选', () => {
    const results = filterAttainmentEvaluations(
      evaluations,
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
      evaluations,
      {
        course: 'all',
        keyword: 'BA-2',
        status: 'all',
      },
    );

    expect(results.map((item) => item.id)).toEqual(['evaluation-ct3']);
  });
});
