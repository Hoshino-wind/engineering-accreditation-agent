import { describe, expect, it } from 'vitest';

import { prototypeOnlyImprovementCases } from '../../../entities/improvement-case';
import { filterImprovementCases } from './filterImprovementCases';

describe('filterImprovementCases', () => {
  it('filters by source and status together', () => {
    const result = filterImprovementCases(
      prototypeOnlyImprovementCases,
      {
        keyword: '',
        source: 'M6',
        status: 'in-progress',
      },
    );

    expect(result.map((item) => item.displayId)).toEqual([
      'QI-2026-014',
    ]);
  });

  it('matches id, title, course or owner keyword', () => {
    const result = filterImprovementCases(
      prototypeOnlyImprovementCases,
      {
        keyword: '李老师',
        source: 'all',
        status: 'all',
      },
    );

    expect(result.map((item) => item.displayId)).toEqual([
      'QI-2026-017',
    ]);
  });
});
