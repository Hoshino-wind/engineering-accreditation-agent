import { describe, expect, it, vi } from 'vitest';

import type { AbilityGraphData } from '../../../entities/ability-graph';
import { generateSelfEvaluationReport } from './generateReport';

vi.mock('../../../shared/api/llmClient', () => ({
  generateReportViaLLM: vi.fn(() =>
    Promise.reject(new Error('LLM not available in unit tests')),
  ),
}));

describe('generateSelfEvaluationReport', () => {
  it('uses the same approved competency coverage path as graph diagnostics', async () => {
    const graph: AbilityGraphData = {
      nodes: [
        {
          id: 'gr-04',
          kind: 'GraduationRequirement',
          code: 'GR-04',
          name: '研究',
          origin: 'standard',
        },
        {
          id: 'c-04-01',
          kind: 'Competency',
          code: 'C-04-01',
          name: '实验方案设计',
          origin: 'standard',
          properties: { parent: 'GR-04' },
        },
        {
          id: 'c-04-02',
          kind: 'Competency',
          code: 'C-04-02',
          name: '数据分析与解释',
          origin: 'standard',
          properties: { parent: 'GR-04' },
        },
        {
          id: 'co-es',
          kind: 'Course',
          code: 'CO-ES',
          name: '嵌入式系统原理',
          origin: 'school',
        },
        {
          id: 'exp-es-01',
          kind: 'Experiment',
          code: 'EXP-ES-01',
          name: 'GPIO 与定时器综合实验',
          origin: 'school',
          properties: { hours: 4 },
        },
      ],
      edges: [
        {
          id: 'contains-1',
          source: 'gr-04',
          target: 'c-04-01',
          kind: 'CONTAINS',
          sourceType: 'rule',
          reviewStatus: 'approved',
        },
        {
          id: 'contains-2',
          source: 'gr-04',
          target: 'c-04-02',
          kind: 'CONTAINS',
          sourceType: 'rule',
          reviewStatus: 'approved',
        },
        {
          id: 'belongs-1',
          source: 'exp-es-01',
          target: 'co-es',
          kind: 'BELONGS_TO',
          sourceType: 'rule',
          reviewStatus: 'approved',
        },
        {
          id: 'supports-1',
          source: 'exp-es-01',
          target: 'c-04-01',
          kind: 'SUPPORTS',
          sourceType: 'ai',
          reviewStatus: 'approved',
          strength: 'strong',
        },
        {
          id: 'supports-2',
          source: 'exp-es-01',
          target: 'c-04-02',
          kind: 'SUPPORTS',
          sourceType: 'ai',
          reviewStatus: 'approved',
          strength: 'strong',
        },
      ],
    };

    const result = await generateSelfEvaluationReport(graph);

    expect(result).toHaveLength(1);
    expect(result[0]?.attainment).toBe(0);
    expect(result[0]?.attainmentLabel).toBe('证据不足');
    expect(result[0]?.schoolStatus).toContain('0/2 个能力指标');
    expect(result[0]?.dataEvidence).toContain('嵌入式系统原理');
    expect(result[0]?.dataEvidence).toContain('GPIO 与定时器综合实验');
  });
});
