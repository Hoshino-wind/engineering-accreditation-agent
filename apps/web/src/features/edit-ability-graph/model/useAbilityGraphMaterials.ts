import { useMemo } from 'react';

import {
  prototypeOnlyTeachingResources,
  useTeachingMaterialsQuery,
} from '../../../entities/teaching-resource';
import { createMaterialSourceRef } from './editAbilityGraphHelpers';
import type { MaterialSourceReference } from './editAbilityGraphTypes';

export function useAbilityGraphMaterials() {
  const materialsQuery = useTeachingMaterialsQuery();
  const references = useMemo<MaterialSourceReference[]>(() => {
    const sourceMaterials = materialsQuery.isError
      ? prototypeOnlyTeachingResources
      : (materialsQuery.data ?? []);

    return sourceMaterials
      .filter((material) => material.status === 'ready')
      .flatMap((material) =>
        material.evidenceFragments.map((fragment) => {
          const key = `${material.versionId}:${fragment.id}`;
          return {
            key,
            label: `${material.name} ${material.version} · ${fragment.coordinate}`,
            source: createMaterialSourceRef(material, fragment),
          };
        }),
      );
  }, [materialsQuery.data, materialsQuery.isError]);
  const referenceByKey = useMemo(
    () =>
      new Map(
        references.map((item) => [item.key, item.source]),
      ),
    [references],
  );

  return {
    isLoading: materialsQuery.isLoading,
    referenceByKey,
    references,
  };
}
