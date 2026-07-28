import { apiClient } from '../../../shared/api/client';

export async function getSystemStatus() {
  const { data, error } = await apiClient.GET('/api/v1/system/status');

  if (error || !data) {
    throw new Error('系统状态请求失败');
  }

  return data;
}
