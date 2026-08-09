import { describe, expect, it } from 'vitest';

import type { ImprovementCase } from '../../../entities/improvement-case';
import { assessImprovementClosure } from './assessImprovementClosure';

const readyCase: ImprovementCase = {
  id: 'improvement-017',
  displayId: 'QI-2026-017',
  title: '单片机基础实验项目更新',
  course: '单片机基础',
  priority: 'high',
  status: 'awaiting-reevaluation',
  source: {
    evidenceHash: 'sha256:src-017',
    label: '诊断发现 finding-001',
    module: 'M5',
    objectId: 'finding-001',
  },
  rootCause: {
    category: '覆盖缺口',
    evidence: '缺少实验评分项',
    summary: '实验评分项不足导致能力指标无法达成',
  },
  action: {
    approvedAt: '2026-02-15',
    completedAt: '2026-06-28',
    dueAt: '2026-03-30',
    owner: '李老师',
    target: '补充3个实验评分项',
    title: '补充实验评分项',
    verificationMethod: '复评确认',
  },
  changes: [
    {
      id: 'change-rubric-1',
      kind: 'rubric',
      name: '评分表v2',
      status: 'approved',
      version: 'v2',
    },
    {
      id: 'change-graph-1',
      kind: 'graph',
      name: '图谱v0.4',
      status: 'draft',
      version: 'v0.4',
    },
  ],
  baseline: 0.45,
  reevaluation: {
    completedAt: '2026-07-01',
    cycle: '2024-2',
    policyVersion: 'v2024-1',
    result: 0.78,
    runId: 'run-001',
    target: 0.7,
  },
};

describe('assessImprovementClosure', () => {
  it('does not allow closure when the action is complete but reevaluation is missing', () => {
    const assessment = assessImprovementClosure(
      {
        ...readyCase,
        reevaluation: undefined,
      },
      'effective',
    );

    expect(assessment.canRequestClosure).toBe(false);
    expect(
      assessment.checks.find((check) => check.id === 'reevaluation')
        ?.status,
    ).toBe('pending');
  });

  it('allows requesting closure only after every reference is complete and effectiveness is effective', () => {
    const assessment = assessImprovementClosure(
      readyCase,
      'effective',
    );

    expect(assessment.canRequestClosure).toBe(true);
    expect(assessment.blockers).toEqual([]);
  });

  it.each(['partially-effective', 'ineffective'] as const)(
    'requires a revised action when the conclusion is %s',
    (effectiveness) => {
      const assessment = assessImprovementClosure(
        readyCase,
        effectiveness,
      );

      expect(assessment.canRequestClosure).toBe(false);
      expect(assessment.requiresRevisedAction).toBe(true);
    },
  );
});
