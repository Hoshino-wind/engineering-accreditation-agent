import { describe, expect, it } from 'vitest';

import type { DiagnosticFinding } from '../../../entities/diagnostic-finding';
import { filterDiagnosticFindings } from './filterDiagnosticFindings';

const findings: DiagnosticFinding[] = [
  {
    id: 'finding-mcu-assessment-ability-gap',
    course: '单片机基础',
    type: 'coverage-gap',
    risk: 'high',
    title: '单片机基础评价能力缺口',
    sourceNode: '单片机基础',
    targetNode: '能力指标 C-05-01',
    relationLabel: 'SUPPORTS',
    suggestedDestination: 'M7',
    graphVersion: 'v1',
    materialSnapshot: 'sha256:mat-1',
    ruleSetVersion: 'v2024-1',
    evidence: [],
    path: [],
    impact: { abilityNodes: 1, courseObjectives: 1, evaluationInputs: 2 },
    rule: {
      id: 'coverage-rule',
      kind: 'deterministic',
      basis: '覆盖度算法',
      rationale: '能力指标缺乏足够支撑',
      runAt: '2026-01-15',
      version: 'v1',
    },
  },
  {
    id: 'finding-ds-experiment-name-conflict',
    course: '数据结构与算法',
    type: 'material-conflict',
    risk: 'medium',
    title: '实验名称在不同材料间不一致',
    sourceNode: '排序算法实验',
    targetNode: '排序实验',
    relationLabel: 'SAME_AS',
    suggestedDestination: 'M4',
    graphVersion: 'v1',
    materialSnapshot: 'sha256:mat-2',
    ruleSetVersion: 'v2024-1',
    evidence: [],
    path: [],
    impact: { abilityNodes: 0, courseObjectives: 0, evaluationInputs: 1 },
    rule: {
      id: 'consistency-rule',
      kind: 'deterministic',
      basis: '一致性检查',
      rationale: '同名实体在不同材料中属性不一致',
      runAt: '2026-01-16',
      version: 'v1',
    },
  },
  {
    id: 'finding-emb-missing-rubric',
    course: '嵌入式系统原理',
    type: 'coverage-gap',
    risk: 'high',
    title: '实验缺少有效评分项',
    sourceNode: '嵌入式系统实验',
    targetNode: '能力指标 C-03-01',
    relationLabel: 'SUPPORTS',
    suggestedDestination: 'M7',
    graphVersion: 'v1',
    materialSnapshot: 'sha256:mat-3',
    ruleSetVersion: 'v2024-1',
    evidence: [],
    path: [],
    impact: { abilityNodes: 1, courseObjectives: 1, evaluationInputs: 1 },
    rule: {
      id: 'rubric-rule',
      kind: 'deterministic',
      basis: '评分表检查',
      rationale: '实验缺少评分表中的评分项',
      runAt: '2026-01-17',
      version: 'v1',
    },
  },
  {
    id: 'finding-mcu-weight-conflict',
    course: '单片机基础',
    type: 'material-conflict',
    risk: 'medium',
    title: '课程目标权重在多份材料间不一致',
    sourceNode: '课程大纲',
    targetNode: '评价表',
    relationLabel: 'WEIGHT',
    suggestedDestination: 'M4',
    graphVersion: 'v1',
    materialSnapshot: 'sha256:mat-4',
    ruleSetVersion: 'v2024-1',
    evidence: [],
    path: [],
    impact: { abilityNodes: 0, courseObjectives: 2, evaluationInputs: 1 },
    rule: {
      id: 'consistency-rule',
      kind: 'deterministic',
      basis: '一致性检查',
      rationale: '权重值在多份材料中不一致',
      runAt: '2026-01-18',
      version: 'v1',
    },
  },
  {
    id: 'finding-emb-objective-wording',
    course: '嵌入式系统原理',
    type: 'material-conflict',
    risk: 'low',
    title: '课程目标表述差异',
    sourceNode: '课程大纲',
    targetNode: '实验指导书',
    relationLabel: 'SAME_AS',
    suggestedDestination: 'M4',
    graphVersion: 'v1',
    materialSnapshot: 'sha256:mat-5',
    ruleSetVersion: 'v2024-1',
    evidence: [],
    path: [],
    impact: { abilityNodes: 0, courseObjectives: 1, evaluationInputs: 0 },
    rule: {
      id: 'semantic-rule',
      kind: 'ai-semantic',
      basis: '语义分析',
      rationale: '目标表述语义相似但不一致',
      runAt: '2026-01-19',
      version: 'v1',
    },
  },
];

describe('filterDiagnosticFindings', () => {
  it('按课程与风险筛选诊断发现', () => {
    const result = filterDiagnosticFindings(findings, {
      course: '嵌入式系统原理',
      findingType: 'all',
      keyword: '',
      risk: 'high',
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe('实验缺少有效评分项');
  });

  it('可通过规则编号检索诊断发现', () => {
    const result = filterDiagnosticFindings(findings, {
      course: 'all',
      findingType: 'all',
      keyword: 'coverage-rule',
      risk: 'all',
    });

    expect(result.map((finding) => finding.id)).toEqual([
      'finding-mcu-assessment-ability-gap',
    ]);
  });

  it('按材料冲突类型筛选', () => {
    const result = filterDiagnosticFindings(findings, {
      course: 'all',
      findingType: 'material-conflict',
      keyword: '',
      risk: 'all',
    });

    expect(result).toHaveLength(3);
  });
});
