import { describe, expect, it } from 'vitest';

import { mapMaterialDto } from './materialDtoMapper';

describe('mapMaterialDto', () => {
  it('maps local scanning state into the existing processing presentation', () => {
    const resource = mapMaterialDto({
      id: 'material-1',
      name: '课程大纲',
      file_name: 'syllabus.txt',
      course: '数据结构',
      resource_type: '课程大纲',
      format: 'TXT',
      media_type: 'text/plain',
      size_bytes: 2048,
      hash: 'SHA256 abc',
      status: 'scanning',
      sensitivity: 'internal',
      owner: '当前用户',
      version: 'v1',
      version_id: 'material-version:material-1:v1',
      source_coverage: 0,
      page_count: null,
      failure_reason: null,
      next_action: '正在扫描',
      created_at: '2026-07-29T08:00:00Z',
      updated_at: '2026-07-29T08:00:00Z',
      processing_stages: [
        { label: '对象扫描', detail: '进行中', status: 'process' },
      ],
      evidence_fragments: [],
    });

    expect(resource.status).toBe('processing');
    expect(resource.size).toBe('2.0 KB');
    expect(resource.format).toBe('TXT');
    expect(resource.versionId).toBe('material-version:material-1:v1');
  });
});
