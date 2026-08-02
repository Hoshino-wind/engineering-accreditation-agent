import { describe, expect, it } from 'vitest';

import { prototypeOnlyImprovementCases } from '../../entities/improvement-case';
import { prototypeOnlySupportPackages } from '../../entities/support-package';

describe('M7 and M8 pilot evidence references', () => {
  it('keeps the baseline and reevaluation run identities aligned', () => {
    const improvementCase = prototypeOnlyImprovementCases.find(
      ({ id }) => id === 'qi-2026-017',
    );
    const supportPackage = prototypeOnlySupportPackages.find(
      ({ id }) => id === 'support-package-001',
    );
    const attainmentReferences = supportPackage?.sections.find(
      ({ id }) => id === 'attainment',
    )?.claims[0]?.referenceIds;
    const improvementReferences = supportPackage?.sections.find(
      ({ id }) => id === 'improvement',
    )?.claims[0]?.referenceIds;

    expect(improvementCase?.source.objectId).toBe('eval-2026-071');
    expect(improvementCase?.reevaluation?.runId).toBe(
      'eval-2026-072',
    );
    expect(attainmentReferences).toContain('EVAL-071');
    expect(improvementReferences).toContain('REEVAL-072');
  });

  it('does not reuse the selected course references for other packages', () => {
    for (const supportPackage of prototypeOnlySupportPackages.slice(1)) {
      const references = supportPackage.sections.flatMap((section) =>
        section.claims.flatMap((claim) => claim.referenceIds),
      );

      expect(references).not.toContain('EVAL-071');
      expect(references).not.toContain('QI-017');
      expect(references).not.toContain('REEVAL-072');
    }
  });
});
