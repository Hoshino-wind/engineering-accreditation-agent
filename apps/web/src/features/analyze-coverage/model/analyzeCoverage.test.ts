import { describe, expect, it } from 'vitest';

import type { AbilityGraphData } from '../../../entities/ability-graph';
import { analyzeCoverage } from './analyzeCoverage';

describe('analyzeCoverage', () => {
  it('counts only approved SUPPORTS edges and exposes material evidence', () => {
    const graph: AbilityGraphData = {
      nodes: [
        {
          id: 'gr-01',
          kind: 'GraduationRequirement',
          code: 'GR-01',
          name: '工程知识',
          origin: 'standard',
        },
        {
          id: 'c-01-01',
          kind: 'Competency',
          code: 'C-01-01',
          name: '工程知识应用',
          origin: 'standard',
          properties: { parent: 'GR-01' },
        },
        {
          id: 'exp-01',
          kind: 'Experiment',
          code: 'EXP-01',
          name: '综合设计实验',
          origin: 'school',
        },
      ],
      edges: [
        {
          id: 'contains',
          source: 'gr-01',
          target: 'c-01-01',
          kind: 'CONTAINS',
          sourceType: 'rule',
          reviewStatus: 'approved',
        },
        {
          id: 'pending-support',
          source: 'exp-01',
          target: 'c-01-01',
          kind: 'SUPPORTS',
          sourceType: 'ai',
          reviewStatus: 'pending',
          strength: 'strong',
        },
        {
          id: 'approved-support',
          source: 'exp-01',
          target: 'c-01-01',
          kind: 'SUPPORTS',
          sourceType: 'ai',
          reviewStatus: 'approved',
          strength: 'strong',
          confidence: 0.92,
          materialResourceId: 'resource-2',
          materialVersion: 'v2',
          materialName: 'lab-guide.pdf',
        },
      ],
    };

    const item = analyzeCoverage(graph).competencies[0]!;
    const requirement = analyzeCoverage(graph).requirements[0]!;
    expect(item.status).toBe('partial');
    expect(requirement.status).toBe('partial');
    expect(item.strongCount).toBe(1);
    expect(item.hasPendingReview).toBe(true);
    expect(item.evidence).toMatchObject([
      {
        edgeId: 'approved-support',
        materialId: 'resource-2',
        materialVersion: 'v2',
        materialName: 'lab-guide.pdf',
        weight: 3,
      },
    ]);
  });

  it('requires two distinct materials and four strength points for full coverage', () => {
    const graph: AbilityGraphData = {
      nodes: [
        {
          id: 'gr-01',
          kind: 'GraduationRequirement',
          code: 'GR-01',
          name: '工程知识',
          origin: 'standard',
        },
        {
          id: 'c-01-01',
          kind: 'Competency',
          code: 'C-01-01',
          name: '工程知识应用',
          origin: 'standard',
          properties: { parent: 'GR-01' },
        },
        {
          id: 'exp-01',
          kind: 'Experiment',
          code: 'EXP-01',
          name: '综合设计实验',
          origin: 'school',
        },
        {
          id: 'rubric-01',
          kind: 'TeachingResource',
          code: 'RUBRIC-01',
          name: '设计评分项',
          origin: 'school',
        },
      ],
      edges: [
        {
          id: 'support-lab',
          source: 'exp-01',
          target: 'c-01-01',
          kind: 'SUPPORTS',
          sourceType: 'ai',
          reviewStatus: 'approved',
          strength: 'strong',
          materialResourceId: 'material-lab',
        },
        {
          id: 'support-rubric',
          source: 'rubric-01',
          target: 'c-01-01',
          kind: 'SUPPORTS',
          sourceType: 'ai',
          reviewStatus: 'approved',
          strength: 'weak',
          materialResourceId: 'material-rubric',
        },
      ],
    };

    expect(analyzeCoverage(graph).competencies[0]?.status).toBe('covered');
  });
});
