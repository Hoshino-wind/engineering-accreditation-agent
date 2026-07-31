import type { AbilityGraphSourceRef } from '../abilityGraph';

export function prototypeSource(
  key: string,
  materialId: string,
  materialVersionId: string,
  material: string,
  version: string,
  coordinate: string,
): AbilityGraphSourceRef {
  return {
    sourceRefId: `source-ref:${key}`,
    materialId,
    materialVersionId,
    evidenceFragmentId: `evidence-fragment:${key}`,
    material,
    version,
    coordinate,
  };
}

