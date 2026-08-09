import { describe, expect, it } from 'vitest';

import type { AttainmentEvaluationItem } from '../../../entities/attainment-evaluation';
import { filterAttainmentEvaluations } from './filterAttainmentEvaluations';

const evaluations: AttainmentEvaluationItem[] = [
  {
    id: 'evaluation-ds-algo',
    abilityCode: 'C-01-01',
    abilityName: '工程问题分析',
    objectiveCode: 'OBJ-01',
    objectiveName: '算法复杂度分析',
    course: '数据结构与算法',
    status: 'approved',
    evidence: [],
    graphVersion: 'v1',
    inputs: [],
    inputSnapshot: { createdAt: '2026-02-01', hash: 'sha256:snap-1' },
    readinessChecks: [],
    scoreSnapshot: '0.82',
    policyVersion: 'v2024-1',
    programVersion: 'v1',
    studentCount: 45,
    threshold: 0.7,
  },
  {
    id: 'evaluation-mcu-tool',
    abilityCode: 'C-05-01',
    abilityName: '现代工具选择与使用',
    objectiveCode: 'OBJ-05',
    objectiveName: '开发工具应用',
    course: '单片机基础',
    status: 'blocked',
    evidence: [],
    graphVersion: 'v1',
    inputs: [],
    inputSnapshot: { createdAt: '2026-02-05', hash: 'sha256:snap-2' },
    readinessChecks: [],
    scoreSnapshot: '',
    policyVersion: 'v2024-1',
    programVersion: 'v1',
    studentCount: 38,
    threshold: 0.7,
  },
  {
    id: 'evaluation-fpga-analysis',
    abilityCode: 'C-03-01',
    abilityName: '设计开发解决方案',
    objectiveCode: 'OBJ-03',
    objectiveName: 'FPGA模块设计',
    course: 'FPGA设计',
    status: 'awaiting-review',
    evidence: [],
    graphVersion: 'v1',
    inputs: [],
    inputSnapshot: { createdAt: '2026-02-10', hash: 'sha256:snap-3' },
    readinessChecks: [],
    scoreSnapshot: '0.75',
    policyVersion: 'v2024-1',
    programVersion: 'v1',
    studentCount: 32,
    threshold: 0.7,
  },
];

describe('filterAttainmentEvaluations', () => {
  it('支持按课程、状态和关键词组合筛选', () => {
    const results = filterAttainmentEvaluations(evaluations, {
      course: '单片机基础',
      keyword: '工具',
      status: 'blocked',
    });

    expect(results.map((item) => item.id)).toEqual(['evaluation-mcu-tool']);
  });

  it('关键词可以匹配能力指标编码', () => {
    const results = filterAttainmentEvaluations(evaluations, {
      course: 'all',
      keyword: 'C-05-01',
      status: 'all',
    });

    expect(results.map((item) => item.id)).toEqual(['evaluation-mcu-tool']);
  });
});
