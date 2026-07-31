import { apiClient } from '../../../shared/api/client';
import { mapMaterialDto } from '../../../entities/teaching-resource';

export interface UploadTeachingMaterialInput {
  course: string;
  file: File;
  resourceType: string;
}

export async function uploadTeachingMaterial({
  course,
  file,
  resourceType,
}: UploadTeachingMaterialInput) {
  const { data, error } = await apiClient.POST('/api/v1/materials', {
    body: {
      course,
      file: file as unknown as string,
      resource_type: resourceType,
    },
    bodySerializer: (body) => {
      const formData = new FormData();
      formData.append('course', body.course);
      formData.append('file', body.file as unknown as Blob, file.name);
      formData.append('resource_type', body.resource_type);
      return formData;
    },
  });

  if (error || !data) {
    throw new Error('上传失败，请确认本地 API 已启动且文件类型受支持');
  }

  return mapMaterialDto(data);
}
