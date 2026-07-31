import { apiClient } from '../../../shared/api/client';
import { mapMaterialDto } from '../model/materialDtoMapper';

export async function getTeachingMaterials() {
  const { data, error } = await apiClient.GET('/api/v1/materials');

  if (error || !data) {
    throw new Error('本地材料服务连接失败');
  }

  return data.items.map(mapMaterialDto);
}
