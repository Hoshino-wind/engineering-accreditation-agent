import { describe, expect, it } from 'vitest';

import type { ImprovementCase } from '../../../entities/improvement-case';
import { filterImprovementCases } from './filterImprovementCases';

const cases: ImprovementCase[] = [
  {
    id: 'improvement-017',
    displayId: 'QI-2026-017',
    title: '单片机基础实验项目更新',
    course: '单片机基础',
    priority: 'high',
    status: 'action-planned',
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
  },
  {
    id: 'improvement-014',
    displayId: 'QI-2026-014',
    title: '数据结构课程目标对齐',
    course: '数据结构与算法',
    priority: 'medium',
    status: 'in-progress',
    source: {
      evidenceHash: 'sha256:src-014',
      label: '达成度评价 evaluation-001',
      module: 'M6',
      objectId: 'evaluation-001',
    },
    rootCause: {
      category: '达成度不足',
      evidence: '评价分数低于阈值',
      summary: '课程目标达成度未达标',
    },
    action: {
      approvedAt: '2026-02-20',
      dueAt: '2026-04-15',
      owner: '张老师',
      target: '调整教学大纲权重',
      title: '调整大纲权重',
      verificationMethod: '重新评价',
    },
    changes: [
      {
        id: 'change-syl-1',
        kind: 'teaching-resource',
        name: '大纲v2',
        status: 'approved',
        version: 'v2',
      },
      {
        id: 'change-graph-2',
        kind: 'graph',
        name: '图谱v0.5',
        status: 'approved',
        version: 'v0.5',
      },
    ],
    baseline: 0.52,
  },
  {
    id: 'improvement-013',
    displayId: 'QI-2026-013',
    title: '嵌入式实验指导书修订',
    course: '嵌入式系统原理',
    priority: 'high',
    status: 'closed',
    source: {
      evidenceHash: 'sha256:src-013',
      label: '材料冲突 finding-002',
      module: 'M3',
      objectId: 'finding-002',
    },
    rootCause: {
      category: '材料冲突',
      evidence: '实验名称不一致',
      summary: '实验项目名称在多份材料间不一致',
    },
    action: {
      approvedAt: '2026-01-10',
      completedAt: '2026-03-01',
      dueAt: '2026-02-28',
      owner: '赵老师',
      target: '统一实验名称',
      title: '统一实验名称',
      verificationMethod: '材料复审',
    },
    changes: [
      {
        id: 'change-guide-1',
        kind: 'teaching-resource',
        name: '指导书v2',
        status: 'approved',
        version: 'v2',
      },
      {
        id: 'change-graph-3',
        kind: 'graph',
        name: '图谱v0.3',
        status: 'approved',
        version: 'v0.3',
      },
    ],
    baseline: 0.6,
    reevaluation: {
      completedAt: '2026-03-15',
      cycle: '2024-1',
      policyVersion: 'v2024-1',
      result: 0.75,
      runId: 'run-002',
      target: 0.7,
    },
    existingEffectiveness: 'effective',
  },
];

describe('filterImprovementCases', () => {
  it('filters by source and status together', () => {
    const result = filterImprovementCases(cases, {
      keyword: '',
      source: 'M6',
      status: 'in-progress',
    });

    expect(result.map((item) => item.displayId)).toEqual([
      'QI-2026-014',
    ]);
  });

  it('matches id, title, course or owner keyword', () => {
    const result = filterImprovementCases(cases, {
      keyword: '李老师',
      source: 'all',
      status: 'all',
    });

    expect(result.map((item) => item.displayId)).toEqual([
      'QI-2026-017',
    ]);
  });
});
