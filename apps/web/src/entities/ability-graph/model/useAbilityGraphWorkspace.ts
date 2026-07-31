import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { SetStateAction } from 'react';

import {
  getAbilityGraphWorkspace,
  publishAbilityGraphWorkspace,
  saveAbilityGraphDraft,
  startAbilityGraphRevision,
} from '../api/abilityGraphApi';
import type { AbilityGraphState } from './abilityGraph';
import type { AbilityGraphWorkspace } from './abilityGraphDtoMapper';
import { prototypeOnlyAbilityGraph } from './prototypeOnlyAbilityGraph';

export const abilityGraphWorkspaceQueryKey = [
  'ability-graph-workspace',
] as const;

async function loadOrInitializeAbilityGraphWorkspace() {
  const current = await getAbilityGraphWorkspace();
  if (current) {
    return current;
  }
  try {
    return await saveAbilityGraphDraft(0, prototypeOnlyAbilityGraph);
  } catch {
    // 两个页面同时初始化时，失败的一方读取已创建的权威工作区。
    const initialized = await getAbilityGraphWorkspace();
    if (!initialized) {
      throw new Error('能力图谱工作区初始化失败');
    }
    return initialized;
  }
}

export function useAbilityGraphWorkspace() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: abilityGraphWorkspaceQueryKey,
    queryFn: loadOrInitializeAbilityGraphWorkspace,
  });

  const saveMutation = useMutation({
    mutationFn: async (
      update: SetStateAction<AbilityGraphState>,
    ): Promise<AbilityGraphWorkspace> => {
      const current = queryClient.getQueryData<AbilityGraphWorkspace>(
        abilityGraphWorkspaceQueryKey,
      );
      if (!current) {
        throw new Error('能力图谱工作区尚未加载');
      }
      const nextGraph =
        typeof update === 'function' ? update(current.graph) : update;
      return saveAbilityGraphDraft(current.revision, nextGraph);
    },
    onError: () =>
      queryClient.invalidateQueries({
        queryKey: abilityGraphWorkspaceQueryKey,
      }),
    onSuccess: (workspace) =>
      queryClient.setQueryData(abilityGraphWorkspaceQueryKey, workspace),
    scope: { id: 'ability-graph-workspace-write' },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const current = queryClient.getQueryData<AbilityGraphWorkspace>(
        abilityGraphWorkspaceQueryKey,
      );
      if (!current) {
        throw new Error('能力图谱工作区尚未加载');
      }
      return publishAbilityGraphWorkspace(current.revision);
    },
    onError: () =>
      queryClient.invalidateQueries({
        queryKey: abilityGraphWorkspaceQueryKey,
      }),
    onSuccess: (workspace) =>
      queryClient.setQueryData(abilityGraphWorkspaceQueryKey, workspace),
    scope: { id: 'ability-graph-workspace-write' },
  });

  const revisionMutation = useMutation({
    mutationFn: async () => {
      const current = queryClient.getQueryData<AbilityGraphWorkspace>(
        abilityGraphWorkspaceQueryKey,
      );
      if (!current) {
        throw new Error('能力图谱工作区尚未加载');
      }
      return startAbilityGraphRevision(current.revision);
    },
    onError: () =>
      queryClient.invalidateQueries({
        queryKey: abilityGraphWorkspaceQueryKey,
      }),
    onSuccess: (workspace) =>
      queryClient.setQueryData(abilityGraphWorkspaceQueryKey, workspace),
    scope: { id: 'ability-graph-workspace-write' },
  });

  return {
    error:
      query.error ??
      saveMutation.error ??
      publishMutation.error ??
      revisionMutation.error,
    graph: query.data?.graph ?? prototypeOnlyAbilityGraph,
    isLoading: query.isLoading,
    isSaving:
      saveMutation.isPending ||
      publishMutation.isPending ||
      revisionMutation.isPending,
    publishGraph: publishMutation.mutateAsync,
    revision: query.data?.revision,
    saveGraph: saveMutation.mutate,
    saveGraphAsync: saveMutation.mutateAsync,
    startRevision: revisionMutation.mutateAsync,
    updatedAt: query.data?.updatedAt,
    updatedBy: query.data?.updatedBy,
  };
}
