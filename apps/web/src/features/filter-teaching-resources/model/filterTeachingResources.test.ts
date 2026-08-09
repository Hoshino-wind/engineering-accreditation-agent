import { describe, expect, it } from 'vitest';

import type { TeachingResource } from '../../../entities/teaching-resource';
import { filterTeachingResources } from './filterTeachingResources';

const resources: TeachingResource[] = [
  {
    id: 'resource-ds-syllabus',
    name: '数据结构与算法课程大纲',
    fileName: 'ds-syllabus.pdf',
    course: '数据结构与算法',
    resourceType: '课程大纲',
    format: 'PDF',
    status: 'ready',
    owner: '张老师',
    hash: 'sha256:ds-syl',
    version: 'v2024-1',
    size: '2.4MB',
    pageCount: 18,
    sensitivity: 'internal',
    sourceCoverage: 0.85,
    updatedAt: '2026-01-10',
    nextAction: '查看提取结果',
    evidenceFragments: [],
    processingStages: [],
  },
  {
    id: 'resource-mcu-rubric',
    name: '单片机基础评分表',
    fileName: 'mcu-rubric.xlsx',
    course: '单片机基础',
    resourceType: '评分表',
    format: 'XLSX',
    status: 'failed',
    owner: '李老师',
    hash: 'sha256:mcu-rub',
    version: 'v2024-1',
    size: '156KB',
    sensitivity: 'internal',
    sourceCoverage: 0,
    updatedAt: '2026-01-12',
    nextAction: '重新上传',
    failureReason: '解析超时',
    evidenceFragments: [],
    processingStages: [],
  },
  {
    id: 'resource-embedded-guide',
    name: '嵌入式系统实验指导书',
    fileName: 'embedded-guide.docx',
    course: '嵌入式系统原理',
    resourceType: '实验指导书',
    format: 'DOCX',
    status: 'ready',
    owner: '赵老师',
    hash: 'sha256:emb-guide',
    version: 'v2024-2',
    size: '1.8MB',
    pageCount: 42,
    sensitivity: 'internal',
    sourceCoverage: 0.72,
    updatedAt: '2026-01-15',
    nextAction: '查看提取结果',
    evidenceFragments: [],
    processingStages: [],
  },
];

describe('filterTeachingResources', () => {
  it('filters by course, resource type and processing status', () => {
    const result = filterTeachingResources(resources, {
      course: '单片机基础',
      keyword: '',
      resourceType: '评分表',
      status: 'failed',
    });

    expect(result.map((resource) => resource.id)).toEqual([
      'resource-mcu-rubric',
    ]);
  });

  it('matches names, file names, courses and owners with a trimmed keyword', () => {
    const result = filterTeachingResources(resources, {
      course: 'all',
      keyword: '  赵老师 ',
      resourceType: 'all',
      status: 'all',
    });

    expect(result.map((resource) => resource.id)).toEqual([
      'resource-embedded-guide',
    ]);
  });
});
