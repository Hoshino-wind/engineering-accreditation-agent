import type {
  AbilityGraphSourceRef,
} from '../../../entities/ability-graph';
import type {
  EvidenceFragment,
  TeachingResource,
} from '../../../entities/teaching-resource';

export function createLocalId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createMaterialSourceRef(
  material: TeachingResource,
  fragment: EvidenceFragment,
): AbilityGraphSourceRef {
  return {
    coordinate: fragment.coordinate,
    evidenceFragmentId: fragment.id,
    material: material.name,
    materialId: material.id,
    materialVersionId: material.versionId,
    sourceRefId: `source-ref:${fragment.id}`,
    version: material.version,
  };
}

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
