import { describe, expect, it } from 'vitest';

import {
  countActiveRoleAssignments,
  countRoleAssignmentScopes,
  prototypeOnlyRoleAssignments,
} from '../index';

describe('role assignment selectors', () => {
  it('counts active assignments through the entity public API', () => {
    expect(
      countActiveRoleAssignments(prototypeOnlyRoleAssignments),
    ).toBe(4);
  });

  it('counts distinct configured scopes without changing their status semantics', () => {
    expect(
      countRoleAssignmentScopes(prototypeOnlyRoleAssignments),
    ).toBe(5);
  });
});
