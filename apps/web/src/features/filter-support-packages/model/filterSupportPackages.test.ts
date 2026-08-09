import { describe, expect, it } from 'vitest';

import type { SupportPackage } from '../../../entities/support-package';
import { filterSupportPackages } from './filterSupportPackages';

const packages: SupportPackage[] = [
  {
    id: 'support-pkg-001',
    displayId: 'SP-2026-001',
    title: '单片机基础认证支撑包',
    course: '单片机基础',
    scope: '电子信息工程',
    cycle: '2024-2026',
    version: 'v1',
    contentHash: 'sha256:pkg-001',
    status: 'changes-required',
    permissionCheck: 'pass',
    sensitiveContentCheck: 'pass',
    template: {
      id: 'tpl-exp-teaching',
      kind: 'experiment-teaching',
      name: '实验教学认证模板',
      version: 'v2024-1',
    },
    sourceSnapshots: [],
    sections: [],
    updatedAt: '2026-02-01',
  },
  {
    id: 'support-pkg-003',
    displayId: 'SP-2026-003',
    title: '数据结构认证支撑包',
    course: '数据结构与算法',
    scope: '电子信息工程',
    cycle: '2024-2026',
    version: 'v1',
    contentHash: 'sha256:pkg-003',
    status: 'approved',
    permissionCheck: 'pass',
    sensitiveContentCheck: 'pass',
    template: {
      id: 'tpl-capstone',
      kind: 'capstone',
      name: '毕业设计认证模板',
      version: 'v2024-1',
    },
    sourceSnapshots: [],
    sections: [],
    updatedAt: '2026-03-01',
    approval: {
      approvedAt: '2026-03-01',
      approver: '专业负责人',
      snapshotHash: 'sha256:pkg-003',
    },
  },
  {
    id: 'support-pkg-005',
    displayId: 'SP-2026-005',
    title: '创新训练认证支撑包',
    course: '创新训练',
    scope: '电子信息工程',
    cycle: '2024-2026',
    version: 'v1',
    contentHash: 'sha256:pkg-005',
    status: 'draft',
    permissionCheck: 'pass',
    sensitiveContentCheck: 'pass',
    template: {
      id: 'tpl-course-teaching',
      kind: 'course-teaching',
      name: '课程教学认证模板',
      version: 'v2024-1',
    },
    sourceSnapshots: [],
    sections: [],
    updatedAt: '2026-03-10',
  },
];

describe('filterSupportPackages', () => {
  it('filters by template and status together', () => {
    const result = filterSupportPackages(packages, {
      keyword: '',
      status: 'approved',
      template: 'capstone',
    });

    expect(result.map((item) => item.displayId)).toEqual([
      'SP-2026-003',
    ]);
  });

  it('matches package id, title, course or template', () => {
    const result = filterSupportPackages(packages, {
      keyword: '创新训练',
      status: 'all',
      template: 'all',
    });

    expect(result.map((item) => item.displayId)).toEqual([
      'SP-2026-005',
    ]);
  });
});
