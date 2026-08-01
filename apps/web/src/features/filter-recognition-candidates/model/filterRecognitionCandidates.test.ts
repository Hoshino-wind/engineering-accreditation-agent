import { describe, expect, it } from 'vitest';

import { prototypeOnlyRecognitionCandidates } from '../../../entities/recognition-candidate';
import { filterRecognitionCandidates } from './filterRecognitionCandidates';

describe('filterRecognitionCandidates', () => {
  it('filters by course, candidate type and risk', () => {
    const candidates = filterRecognitionCandidates(
      prototypeOnlyRecognitionCandidates,
      {
        candidateType: '关系候选',
        course: '数据结构与算法',
        keyword: '',
        risk: 'conflict',
      },
    );

    expect(candidates.map((candidate) => candidate.id)).toEqual([
      'candidate-sort-conflict',
    ]);
  });

  it('matches source and target node names with a trimmed keyword', () => {
    const candidates = filterRecognitionCandidates(
      prototypeOnlyRecognitionCandidates,
      {
        candidateType: 'all',
        course: 'all',
        keyword: '  C-05-01 ',
        risk: 'all',
      },
    );

    expect(candidates.map((candidate) => candidate.id)).toEqual([
      'candidate-system-c0501',
    ]);
  });
});
