import { describe, expect, it } from 'vitest';

import {
  prototypeOnlySupportPackages,
  type SupportPackage,
} from '../../../entities/support-package';
import { validateSupportPackage } from './validateSupportPackage';

const blockedPackage = prototypeOnlySupportPackages[0] as SupportPackage;
const approvedPackage = prototypeOnlySupportPackages[2] as SupportPackage;

describe('validateSupportPackage', () => {
  it('blocks an unapproved evaluation and an open improvement issue', () => {
    const result = validateSupportPackage(blockedPackage);

    expect(result.blockedCount).toBe(2);
    expect(result.canSubmitForReview).toBe(false);
    expect(result.canExport).toBe(false);
    expect(
      result.checks.find((check) => check.id === 'evaluation'),
    ).toMatchObject({
      ownerModule: 'M6',
      sourceObjectId: 'eval-2026-071',
      status: 'blocked',
    });
    expect(
      result.checks.find((check) => check.id === 'improvement'),
    ).toMatchObject({
      ownerModule: 'M7',
      sourceObjectId: 'qi-2026-017',
      status: 'blocked',
    });
  });

  it('blocks formal claims without source references', () => {
    const result = validateSupportPackage({
      ...approvedPackage,
      sections: approvedPackage.sections.map((section, index) =>
        index === 0
          ? {
              ...section,
              claims: section.claims.map((claim) => ({
                ...claim,
                referenceIds: [],
              })),
            }
          : section,
      ),
    });

    expect(
      result.checks.find((check) => check.id === 'references')?.status,
    ).toBe('blocked');
  });

  it('allows controlled export only for an approved matching snapshot', () => {
    const result = validateSupportPackage(approvedPackage);

    expect(result.blockedCount).toBe(0);
    expect(result.canExport).toBe(true);
  });

  it('rejects a truncated or non-SHA-256 content hash', () => {
    const result = validateSupportPackage({
      ...approvedPackage,
      contentHash: 'sha256:0037…b921',
    });

    expect(
      result.checks.find((check) => check.id === 'content-hash'),
    ).toMatchObject({
      status: 'blocked',
    });
    expect(result.canExport).toBe(false);
  });

  it('requires a new package version after approved content changes', () => {
    const result = validateSupportPackage({
      ...approvedPackage,
      contentHash: 'sha256:changed',
    });

    expect(result.requiresNewVersion).toBe(true);
    expect(result.canExport).toBe(false);
  });
});
