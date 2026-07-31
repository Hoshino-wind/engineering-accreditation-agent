import type { components } from '@engineering-accreditation/api-client';

import { apiClient } from '../../../shared/api/client';
import type { AbilityGraphState } from '../model/abilityGraph';
import { mapAbilityGraphWorkspaceDto } from '../model/abilityGraphDtoMapper';

type GraphStateDto = components['schemas']['AbilityGraphStateContract'];

function toGraphStateDto(state: AbilityGraphState): GraphStateDto {
  return state;
}

function graphApiError(action: string, error: unknown) {
  const detail =
    typeof error === 'object' && error && 'detail' in error
      ? JSON.stringify(error.detail)
      : '';
  return new Error(`${action}失败${detail ? `：${detail}` : ''}`);
}

export async function getAbilityGraphWorkspace() {
  const { data, error, response } = await apiClient.GET(
    '/api/v1/teaching-graph/workspace',
  );
  if (response.status === 404) {
    return null;
  }
  if (error || !data) {
    throw graphApiError('读取能力图谱工作区', error);
  }
  return mapAbilityGraphWorkspaceDto(data);
}

export async function saveAbilityGraphDraft(
  expectedRevision: number,
  state: AbilityGraphState,
) {
  const { data, error } = await apiClient.PUT(
    '/api/v1/teaching-graph/workspace',
    {
      body: {
        expectedRevision,
        state: toGraphStateDto(state),
      },
    },
  );
  if (error || !data) {
    throw graphApiError('保存能力图谱草稿', error);
  }
  return mapAbilityGraphWorkspaceDto(data);
}

export async function publishAbilityGraphWorkspace(expectedRevision: number) {
  const { data, error } = await apiClient.POST(
    '/api/v1/teaching-graph/workspace/publish',
    { body: { expectedRevision } },
  );
  if (error || !data) {
    throw graphApiError('发布能力图谱', error);
  }
  return mapAbilityGraphWorkspaceDto(data);
}

export async function startAbilityGraphRevision(expectedRevision: number) {
  const { data, error } = await apiClient.POST(
    '/api/v1/teaching-graph/workspace/revisions',
    { body: { expectedRevision } },
  );
  if (error || !data) {
    throw graphApiError('创建能力图谱修订', error);
  }
  return mapAbilityGraphWorkspaceDto(data);
}
