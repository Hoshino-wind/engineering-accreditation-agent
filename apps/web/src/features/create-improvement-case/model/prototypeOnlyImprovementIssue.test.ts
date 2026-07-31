import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createPrototypeOnlyImprovementIssue,
  toImprovementCase,
} from './prototypeOnlyImprovementIssue';

afterEach(() => {
  vi.useRealTimers();
});

describe('prototype-only improvement issue model', () => {
  it('creates the local record with the compatible id and trimmed title', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-30T08:30:00.000Z'));

    const issue = createPrototypeOnlyImprovementIssue({
      course: '数据结构',
      owner: '专业负责人',
      source: 'M6',
      title: '  课程目标证据覆盖不足  ',
    });

    expect(issue).toEqual({
      course: '数据结构',
      createdAt: '2026-07-30T08:30:00.000Z',
      id: `IMPR-LOCAL-${Date.now()}`,
      owner: '专业负责人',
      source: 'M6',
      title: '课程目标证据覆盖不足',
    });
  });

  it('projects a manual issue into the existing improvement case contract', () => {
    const improvementCase = toImprovementCase({
      course: '',
      createdAt: '2026-07-30T08:30:00.000Z',
      id: 'IMPR-LOCAL-42',
      owner: '课程负责人',
      source: 'manual',
      title: '实验材料缺少版本说明',
    });

    expect(improvementCase).toMatchObject({
      action: {
        dueAt: '2026-08-29',
        owner: '课程负责人',
        target: '待制定量化目标',
        title: '待制定改进措施',
        verificationMethod: '待制定验证方法',
      },
      baseline: 0,
      changes: [],
      course: '软件工程',
      displayId: 'QI-LOCAL-42',
      id: 'IMPR-LOCAL-42',
      priority: 'medium',
      source: {
        evidenceHash: 'local:pending',
        label: '人工发现',
        module: 'M3',
        objectId: 'IMPR-LOCAL-42-source',
      },
      status: 'diagnosing',
      title: '实验材料缺少版本说明',
    });
  });
});
