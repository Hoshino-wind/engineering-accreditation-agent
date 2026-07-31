import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { usePrototypeOnlyModelDataPolicies } from '../index';

describe('usePrototypeOnlyModelDataPolicies', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('updates only the selected local model policy', () => {
    const { result } = renderHook(() =>
      usePrototypeOnlyModelDataPolicies(),
    );

    act(() => {
      result.current.updatePolicy('sensitive', {
        route: 'blocked',
      });
    });

    expect(
      result.current.policies.find(
        (policy) => policy.key === 'sensitive',
      )?.route,
    ).toBe('blocked');
    expect(
      result.current.policies.find(
        (policy) => policy.key === 'public',
      )?.route,
    ).toBe('approved-private-model');
  });
});
