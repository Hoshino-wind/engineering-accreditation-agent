import { describe, expect, it } from 'vitest';

import {
  prototypeOnlyImprovementCases,
  type ImprovementCase,
} from '../../../entities/improvement-case';
import { assessImprovementClosure } from './assessImprovementClosure';

const readyCase = prototypeOnlyImprovementCases[0] as ImprovementCase;

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
