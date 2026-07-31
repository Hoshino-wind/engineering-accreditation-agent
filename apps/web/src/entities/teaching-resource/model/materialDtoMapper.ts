import type { components } from '@engineering-accreditation/api-client';

import type {
  TeachingResource,
  TeachingResourceStatus,
  TeachingResourceType,
} from './teachingResource';

type MaterialDto = components['schemas']['MaterialResponse'];

const resourceTypes = new Set<TeachingResourceType>([
  '课程大纲',
  '实验指导书',
  '实验项目清单',
  '评分表',
  '学生报告',
  '评价结果',
  '改进记录',
]);

const formats = new Set<TeachingResource['format']>([
  'PDF',
  'DOCX',
  'XLSX',
  'TXT',
  'CSV',
  'MD',
  'PNG',
  'JPG',
  'JPEG',
  'WEBP',
]);

function mapStatus(status: MaterialDto['status']): TeachingResourceStatus {
  if (status === 'uploaded' || status === 'scanning') {
    return 'processing';
  }
  return status;
}

function formatBytes(value: number): string {
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function mapMaterialDto(dto: MaterialDto): TeachingResource {
  const resourceType = resourceTypes.has(
    dto.resource_type as TeachingResourceType,
  )
    ? (dto.resource_type as TeachingResourceType)
    : '实验项目清单';
  const upperFormat = dto.format.toUpperCase() as TeachingResource['format'];

  return {
    course: dto.course,
    evidenceFragments: dto.evidence_fragments.map((fragment) => ({
      coordinate: fragment.coordinate,
      hash: fragment.hash,
      id: fragment.id,
      preview: fragment.preview,
      type: fragment.type,
    })),
    failureReason: dto.failure_reason ?? undefined,
    fileName: dto.file_name,
    format: formats.has(upperFormat) ? upperFormat : 'TXT',
    hash: dto.hash,
    id: dto.id,
    name: dto.name,
    nextAction: dto.next_action,
    owner: dto.owner,
    pageCount: dto.page_count ?? undefined,
    processingStages: dto.processing_stages,
    resourceType,
    sensitivity: dto.sensitivity,
    size: formatBytes(dto.size_bytes),
    sourceCoverage: dto.source_coverage,
    status: mapStatus(dto.status),
    updatedAt: new Date(dto.updated_at).toLocaleString('zh-CN'),
    version: dto.version,
    versionId: dto.version_id,
  };
}
