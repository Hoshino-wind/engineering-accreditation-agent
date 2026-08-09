import { describe, expect, it } from 'vitest';

import type { SupportPackage } from '../../../entities/support-package';
import { validateSupportPackage } from './validateSupportPackage';

const blockedPackage: SupportPackage = {
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
  sourceSnapshots: [
    {
      id: 'src-m2',
      label: '能力图谱',
      module: 'M2',
      objectId: 'graph-v1',
      version: 'v1',
      count: 75,
      state: 'formal',
    },
    {
      id: 'src-m6',
      label: '达成度评价',
      module: 'M6',
      objectId: 'evaluation-001',
      version: 'v1',
      count: 6,
      state: 'unapproved',
    },
    {
      id: 'src-m7',
      label: '改进措施',
      module: 'M7',
      objectId: 'improvement-014',
      version: 'v1',
      count: 3,
      state: 'open',
    },
  ],
  sections: [
    {
      id: 'sec-attainment',
      code: 'attainment',
      title: '达成度评价',
      status: 'blocked',
      summary: '评价运行尚未批准',
      referenceCount: 2,
      claims: [
        {
          id: 'claim-1',
          text: '能力指标 C-01-01 达成度 78%',
          referenceIds: ['ref-1', 'ref-2'],
        },
      ],
    },
    {
      id: 'sec-improvement',
      code: 'improvement',
      title: '持续改进',
      status: 'blocked',
      summary: '改进问题尚未关闭',
      referenceCount: 1,
      claims: [
        {
          id: 'claim-2',
          text: '已制定改进措施',
          referenceIds: ['ref-3'],
        },
      ],
    },
  ],
  updatedAt: '2026-02-01',
};

const approvedPackage: SupportPackage = {
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
  sourceSnapshots: [
    {
      id: 'src-m2',
      label: '能力图谱',
      module: 'M2',
      objectId: 'graph-v1',
      version: 'v1',
      count: 75,
      state: 'formal',
    },
    {
      id: 'src-m6',
      label: '达成度评价',
      module: 'M6',
      objectId: 'evaluation-003',
      version: 'v1',
      count: 6,
      state: 'formal',
    },
    {
      id: 'src-m7',
      label: '改进措施',
      module: 'M7',
      objectId: 'improvement-013',
      version: 'v1',
      count: 2,
      state: 'confirmed',
    },
  ],
  sections: [
    {
      id: 'sec-attainment',
      code: 'attainment',
      title: '达成度评价',
      status: 'ready',
      summary: '全部达成',
      referenceCount: 2,
      claims: [
        {
          id: 'claim-1',
          text: '能力指标 C-01-01 达成度 82%',
          referenceIds: ['ref-1', 'ref-2'],
        },
      ],
    },
    {
      id: 'sec-improvement',
      code: 'improvement',
      title: '持续改进',
      status: 'ready',
      summary: '改进已闭环',
      referenceCount: 1,
      claims: [
        {
          id: 'claim-2',
          text: '改进措施有效',
          referenceIds: ['ref-3'],
        },
      ],
    },
  ],
  approval: {
    approvedAt: '2026-03-01',
    approver: '专业负责人',
    snapshotHash: 'sha256:pkg-003',
  },
  updatedAt: '2026-03-01',
};

describe('validateSupportPackage', () => {
  it('blocks an unapproved evaluation and an open improvement issue', () => {
    const result = validateSupportPackage(blockedPackage);

    expect(result.blockedCount).toBe(2);
    expect(result.canSubmitForReview).toBe(false);
    expect(result.canExport).toBe(false);
  });

  it('blocks formal claims without source references', () => {
    const result = validateSupportPackage({
      ...approvedPackage,
      sections: approvedPackage.sections.map((section, index) =>
        index === 0
          ? {
              ...section,
              claims: section.claims.map((claim) => ({
                ...claim,
                referenceIds: [],
              })),
            }
          : section,
      ),
    });

    expect(
      result.checks.find((check) => check.id === 'references')?.status,
    ).toBe('blocked');
  });

  it('allows controlled export only for an approved matching snapshot', () => {
    const result = validateSupportPackage(approvedPackage);

    expect(result.blockedCount).toBe(0);
    expect(result.canExport).toBe(true);
  });

  it('requires a new package version after approved content changes', () => {
    const result = validateSupportPackage({
      ...approvedPackage,
      contentHash: 'sha256:changed',
    });

    expect(result.requiresNewVersion).toBe(true);
    expect(result.canExport).toBe(false);
  });
});
