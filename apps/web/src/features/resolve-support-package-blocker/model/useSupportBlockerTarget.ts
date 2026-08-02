import {
  type AttainmentEvaluationObjectList,
  type AttainmentEvaluationRunReference,
  useAttainmentEvaluationObjectsQuery,
  useAttainmentEvaluationRunReferenceQuery,
} from '../../../entities/attainment-evaluation';
import type { SupportSourceModule } from '../../../entities/support-package';

const moduleRoutes: Partial<Record<SupportSourceModule, string>> = {
  M2: '/graph',
  M3: '/resources',
  M5: '/diagnostics',
  M6: '/evaluations',
  M7: '/improvements',
};

export type SupportBlockerTargetKind =
  | 'exact'
  | 'module'
  | 'not-found'
  | 'object-unavailable'
  | 'service-unavailable'
  | 'unsupported';

interface ResolveSupportBlockerTargetOptions {
  evaluationObjects?: AttainmentEvaluationObjectList;
  evaluationObjectsStatus: 'error' | 'pending' | 'success';
  evaluationReference?: AttainmentEvaluationRunReference | null;
  evaluationReferenceStatus: 'error' | 'pending' | 'success';
  module: SupportSourceModule;
  sourceObjectId?: string;
}

export interface SupportBlockerTarget {
  kind: SupportBlockerTargetKind;
  route?: string;
}

export function resolveSupportBlockerTarget({
  evaluationObjects,
  evaluationObjectsStatus,
  evaluationReference,
  evaluationReferenceStatus,
  module,
  sourceObjectId,
}: ResolveSupportBlockerTargetOptions): SupportBlockerTarget {
  const moduleRoute = moduleRoutes[module];

  if (!moduleRoute) {
    return { kind: 'unsupported' };
  }
  if (!sourceObjectId) {
    return { kind: 'module', route: moduleRoute };
  }
  if (module === 'M7') {
    const normalizedSourceObjectId = sourceObjectId.trim();
    if (!normalizedSourceObjectId) {
      return { kind: 'module', route: moduleRoute };
    }
    const searchParams = new URLSearchParams({
      case: normalizedSourceObjectId,
    });
    return {
      kind: 'exact',
      route: `${moduleRoute}?${searchParams.toString()}`,
    };
  }
  if (module !== 'M6') {
    return { kind: 'module', route: moduleRoute };
  }
  if (
    evaluationReferenceStatus === 'error' ||
    evaluationObjectsStatus === 'error'
  ) {
    return { kind: 'service-unavailable', route: moduleRoute };
  }
  if (
    evaluationReferenceStatus !== 'success' ||
    evaluationObjectsStatus !== 'success'
  ) {
    return { kind: 'module', route: moduleRoute };
  }
  if (!evaluationReference) {
    return { kind: 'not-found', route: moduleRoute };
  }

  const evaluationObject = evaluationObjects?.items.find(
    ({ id }) => id === evaluationReference.evaluationObjectId,
  );
  if (!evaluationObject) {
    return { kind: 'object-unavailable', route: moduleRoute };
  }

  const searchParams = new URLSearchParams({
    evaluation: evaluationReference.evaluationObjectId,
    run: evaluationReference.runId,
  });
  return {
    kind: 'exact',
    route: `${moduleRoute}?${searchParams.toString()}`,
  };
}

export function useSupportBlockerTarget(
  module: SupportSourceModule,
  sourceObjectId?: string,
) {
  const shouldResolveEvaluation =
    module === 'M6' && Boolean(sourceObjectId);
  const evaluationReferenceQuery =
    useAttainmentEvaluationRunReferenceQuery(
      sourceObjectId,
      shouldResolveEvaluation,
    );
  const evaluationObjectsQuery =
    useAttainmentEvaluationObjectsQuery(shouldResolveEvaluation);
  const hasServiceError =
    evaluationReferenceQuery.isError || evaluationObjectsQuery.isError;

  return {
    ...resolveSupportBlockerTarget({
      evaluationObjects: evaluationObjectsQuery.data,
      evaluationObjectsStatus: evaluationObjectsQuery.status,
      evaluationReference: evaluationReferenceQuery.data,
      evaluationReferenceStatus: evaluationReferenceQuery.status,
      module,
      sourceObjectId,
    }),
    isLoading:
      shouldResolveEvaluation &&
      !hasServiceError &&
      (evaluationReferenceQuery.isPending ||
        evaluationObjectsQuery.isPending),
  };
}
