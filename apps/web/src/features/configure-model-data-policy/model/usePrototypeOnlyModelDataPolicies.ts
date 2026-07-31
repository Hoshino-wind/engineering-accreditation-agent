import { useCallback } from 'react';

import {
  prototypeOnlyModelDataPolicies,
  type ModelDataPolicy,
  type ModelDataPolicyKey,
} from '../../../entities/model-data-policy';
import { useLocalStorageState } from '../../../shared/lib';

const storageKey =
  'engineering-accreditation.governance.model-policies.v1';

type ModelDataPolicyPatch = Partial<
  Pick<
    ModelDataPolicy,
    'citationRequired' | 'redactBeforeModel' | 'route'
  >
>;

export function usePrototypeOnlyModelDataPolicies() {
  const [policies, setPolicies] = useLocalStorageState<
    ModelDataPolicy[]
  >(storageKey, prototypeOnlyModelDataPolicies);

  const updatePolicy = useCallback(
    (key: ModelDataPolicyKey, patch: ModelDataPolicyPatch) => {
      setPolicies((current) =>
        current.map((policy) =>
          policy.key === key ? { ...policy, ...patch } : policy,
        ),
      );
    },
    [setPolicies],
  );

  return { policies, updatePolicy };
}
