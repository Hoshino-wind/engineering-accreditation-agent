import { describe, expect, it } from 'vitest';

import { prototypeOnlySupportPackages } from '../../../entities/support-package';
import { filterSupportPackages } from './filterSupportPackages';

describe('filterSupportPackages', () => {
  it('filters by template and status together', () => {
    const result = filterSupportPackages(prototypeOnlySupportPackages, {
      keyword: '',
      status: 'approved',
      template: 'capstone',
    });

    expect(result.map((item) => item.displayId)).toEqual([
      'SP-2026-003',
    ]);
  });

  it('matches package id, title, course or template', () => {
    const result = filterSupportPackages(prototypeOnlySupportPackages, {
      keyword: '创新训练',
      status: 'all',
      template: 'all',
    });

    expect(result.map((item) => item.displayId)).toEqual([
      'SP-2026-005',
    ]);
  });
});
