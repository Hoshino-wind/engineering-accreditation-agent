import { apiClient } from '../../../shared/api/client';
import { mapMaterialDto } from '../model/materialDtoMapper';

export async function retryTeachingMaterial(materialId: string) {
  const { data, error } = await apiClient.POST(
    '/api/v1/materials/{material_id}/retry',
    { params: { path: { material_id: materialId } } },
  );

  if (error || !data) {
    throw new Error('材料重试失败，请确认原文件仍在本地对象目录');
  }

  return mapMaterialDto(data);
}
