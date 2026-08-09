import { describe, expect, it } from 'vitest';

import type { RecognitionCandidate } from '../../../entities/recognition-candidate';
import { filterRecognitionCandidates } from './filterRecognitionCandidates';

const candidates: RecognitionCandidate[] = [
  {
    id: 'candidate-sort-conflict',
    candidateType: '关系候选',
    course: '数据结构与算法',
    risk: 'conflict',
    confidence: 0.65,
    relation: 'SUPPORTS',
    sourceNode: '排序算法实验',
    targetNode: '能力指标 C-01-01 工程问题分析',
    title: '排序算法实验与C-01-01关系冲突',
    explanation: '已有手工关系与AI推断冲突',
    generatedAt: '2026-01-20',
    processorVersion: 'v1',
    evidence: [],
    impact: { abilityNodes: 1, courseObjectives: 1, rubricItems: 0 },
    conflictMessage: '已存在手工确认的 SUPPORTS 关系',
    existingFormalValue: {
      relation: 'SUPPORTS',
      sourceNode: '排序算法实验',
      targetNode: '能力指标 C-01-01 工程问题分析',
      version: 'v1',
    },
  },
  {
    id: 'candidate-system-c0501',
    candidateType: '关系候选',
    course: '嵌入式系统原理',
    risk: 'lowConfidence',
    confidence: 0.72,
    relation: 'SUPPORTS',
    sourceNode: 'GPIO实验',
    targetNode: '能力指标 C-05-01 现代工具选择与使用',
    title: 'GPIO实验支撑C-05-01',
    explanation: 'AI推断GPIO实验支撑现代工具能力',
    generatedAt: '2026-01-22',
    processorVersion: 'v1',
    evidence: [],
    impact: { abilityNodes: 1, courseObjectives: 1, rubricItems: 2 },
  },
  {
    id: 'candidate-gpio-duplicate',
    candidateType: '节点候选',
    course: '单片机基础',
    risk: 'conflict',
    confidence: 0.55,
    relation: 'MERGE',
    sourceNode: 'GPIO配置实验',
    targetNode: 'GPIO实验',
    title: 'GPIO节点可能重复',
    explanation: '两份材料中出现名称相似的实验节点',
    generatedAt: '2026-01-23',
    processorVersion: 'v1',
    evidence: [],
    impact: { abilityNodes: 1, courseObjectives: 0, rubricItems: 0 },
  },
];

describe('filterRecognitionCandidates', () => {
  it('filters by course, candidate type and risk', () => {
    const result = filterRecognitionCandidates(candidates, {
      candidateType: '关系候选',
      course: '数据结构与算法',
      keyword: '',
      risk: 'conflict',
      reviewStatus: 'all',
    });

    expect(result.map((candidate) => candidate.id)).toEqual([
      'candidate-sort-conflict',
    ]);
  });

  it('matches source and target node names with a trimmed keyword', () => {
    const result = filterRecognitionCandidates(candidates, {
      candidateType: 'all',
      course: 'all',
      keyword: '  C-05-01 ',
      risk: 'all',
      reviewStatus: 'all',
    });

    expect(result.map((candidate) => candidate.id)).toEqual([
      'candidate-system-c0501',
    ]);
  });
});
