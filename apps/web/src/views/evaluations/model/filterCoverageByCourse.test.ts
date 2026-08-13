import { describe, expect, it } from 'vitest';

import type { AbilityGraphData } from '../../../entities/ability-graph';
import type { CoverageData } from '../../../shared/api/graphClient';
import { filterCoverageByCourse } from './filterCoverageByCourse';

const graph: AbilityGraphData = {
  nodes: [
    {
      id: 'std-gr-01',
      kind: 'GraduationRequirement',
      code: 'GR-01',
      name: '工程知识',
      origin: 'standard',
    },
    {
      id: 'std-c-01-01',
      kind: 'Competency',
      code: 'C-01-01',
      name: '工程知识应用',
      origin: 'standard',
    },
    {
      id: 'ext-co-es',
      kind: 'Course',
      code: 'CO-ES',
      name: '嵌入式系统原理',
      origin: 'school',
    },
    {
      id: 'ext-exp-demo-c01-01',
      kind: 'Experiment',
      code: 'EXP-DEMO-C01-01',
      name: 'GPIO 与定时器基础验证实验',
      origin: 'school',
    },
  ],
  edges: [
    {
      id: 'belongs',
      source: 'ext-exp-demo-c01-01',
      target: 'ext-co-es',
      kind: 'BELONGS_TO',
      sourceType: 'rule',
      reviewStatus: 'approved',
    },
  ],
};

const coverage: CoverageData = {
  overallCoverageRate: 0.5,
  gapCount: 0,
  partialCount: 1,
  coveredCount: 1,
  orphanNodeCount: 0,
  requirements: [
    {
      code: 'GR-01',
      name: '工程知识',
      status: 'covered',
      coverageRate: 1,
      competencyCount: 1,
      coveredCount: 1,
      strongSupportCount: 1,
      supportingCourses: [],
    },
    {
      code: 'GR-02',
      name: '问题分析',
      status: 'partial',
      coverageRate: 0,
      competencyCount: 1,
      coveredCount: 0,
      strongSupportCount: 0,
      supportingCourses: [],
    },
  ],
  competencies: [
    {
      code: 'C-01-01',
      name: '工程知识应用',
      requirementCode: 'GR-01',
      status: 'covered',
      totalStrength: 4,
      strongCount: 1,
      mediumCount: 0,
      weakCount: 1,
      supporterCount: 2,
      evidenceSourceCount: 2,
      hasPendingReview: false,
      attainment: 1,
      supporters: ['GPIO 与定时器基础验证实验'],
      evidence: [
        {
          edgeId: 'support-1',
          sourceNodeId: 'ext-exp-demo-c01-01',
          sourceCode: 'EXP-DEMO-C01-01',
          sourceName: 'GPIO 与定时器基础验证实验',
          strength: 'strong',
          weight: 3,
          reviewStatus: 'approved',
          counted: true,
          countReason: '教师已审核通过',
        },
      ],
    },
    {
      code: 'C-02-01',
      name: '问题识别与表达',
      requirementCode: 'GR-02',
      status: 'partial',
      totalStrength: 3,
      strongCount: 1,
      mediumCount: 0,
      weakCount: 0,
      supporterCount: 1,
      evidenceSourceCount: 1,
      hasPendingReview: false,
      attainment: 0.75,
      supporters: ['其他课程实验'],
      evidence: [
        {
          edgeId: 'support-2',
          sourceNodeId: 'ext-other-exp',
          sourceCode: 'EXP-OTHER',
          sourceName: '其他课程实验',
          strength: 'strong',
          weight: 3,
          reviewStatus: 'approved',
          counted: true,
          countReason: '教师已审核通过',
        },
      ],
    },
  ],
};

describe('filterCoverageByCourse', () => {
  it('keeps competencies supported by experiments belonging to the selected course', () => {
    const result = filterCoverageByCourse(
      coverage,
      '嵌入式系统原理',
      graph,
    );

    expect(result.competencies.map((item) => item.code)).toEqual(['C-01-01']);
    expect(result.requirements.find((item) => item.code === 'GR-01')).toMatchObject({
      competencyCount: 1,
      coveredCount: 1,
      coverageRate: 1,
      supportingCourses: ['嵌入式系统原理'],
    });
  });

  it('does not filter in all-course mode', () => {
    expect(filterCoverageByCourse(coverage, null, graph)).toBe(coverage);
  });
});
