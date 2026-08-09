import { describe, expect, it } from 'vitest';

import type { AttainmentEvaluationItem } from '../../../entities/attainment-evaluation';
import { calculateAttainment } from './calculateAttainment';

const baseEvaluation: AttainmentEvaluationItem = {
  abilityCode: 'C-01-01',
  abilityName: '工程知识应用',
  course: '数据结构与算法',
  evidence: [],
  graphVersion: '图谱 v0.3',
  id: 'evaluation-test',
  inputSnapshot: {
    createdAt: '2026-07-28 09:42',
    hash: 'sha256:test',
  },
  inputs: [
    {
      evidenceName: '评分表 A',
      id: 'input-a',
      label: '正确性',
      scoreRate: 0.86,
      weight: 0.6,
    },
    {
      evidenceName: '评分表 B',
      id: 'input-b',
      label: '效率',
      scoreRate: 0.76,
      weight: 0.4,
    },
  ],
  objectiveCode: 'CO-DS-1',
  objectiveName: '课程目标1：算法设计正确性',
  policyVersion: 'policy v1.2',
  programVersion: 'evaluator 0.8.0',
  readinessChecks: [],
  scoreSnapshot: '2026-07-28',
  status: 'awaiting-review',
  studentCount: 42,
  threshold: 0.7,
};

describe('calculateAttainment', () => {
  it('按版本化权重计算可人工复算的结果', () => {
    const result = calculateAttainment(baseEvaluation);

    expect(result.ready).toBe(true);
    expect(result.score).toBe(0.82);
    expect(result.contributions.map((item) => item.value)).toEqual([
      0.516, 0.304,
    ]);
    expect(result.outcome).toBe('achieved');
  });

  it('评分输入缺失时阻断正式结果', () => {
    const result = calculateAttainment({
      ...baseEvaluation,
      inputs: [
        {
          ...baseEvaluation.inputs[0]!,
          scoreRate: undefined,
        },
        baseEvaluation.inputs[1]!,
      ],
    });

    expect(result.ready).toBe(false);
    expect(result.score).toBeUndefined();
    expect(result.blockers).toContain('正确性缺少有效得分率');
  });

  it('权重未闭合时阻断正式结果', () => {
    const result = calculateAttainment({
      ...baseEvaluation,
      inputs: baseEvaluation.inputs.map((input) => ({
        ...input,
        weight: 0.4,
      })),
    });

    expect(result.ready).toBe(false);
    expect(result.score).toBeUndefined();
    expect(result.blockers).toContain(
      '评分项权重合计为 0.8，必须等于 1',
    );
  });
});
