import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createPrototypeOnlySupportPackageRecord,
  toSupportPackage,
} from './prototypeOnlySupportPackage';

afterEach(() => {
  vi.useRealTimers();
});

describe('prototype-only support package model', () => {
  it('creates the compatible local record with a trimmed title', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-30T08:30:00.000Z'));

    const localPackage = createPrototypeOnlySupportPackageRecord({
      course: '数据结构',
      template: 'experiment-teaching',
      title: '  数据结构实验教学认证支撑包  ',
    });

    expect(localPackage).toEqual({
      course: '数据结构',
      createdAt: '2026-07-30T08:30:00.000Z',
      id: `PKG-LOCAL-${Date.now()}`,
      template: 'experiment-teaching',
      title: '数据结构实验教学认证支撑包',
    });
  });

  it('projects the local record into the existing support package contract', () => {
    const createdAt = '2026-07-30T08:30:00.000Z';
    const supportPackage = toSupportPackage({
      course: '软件工程',
      createdAt,
      id: 'PKG-LOCAL-42',
      template: 'capstone',
      title: '毕业设计认证支撑包',
    });

    expect(supportPackage).toEqual({
      contentHash: 'local:pending',
      course: '软件工程',
      cycle: '2025—2026 学年',
      displayId: 'SP-LOCAL-42',
      id: 'PKG-LOCAL-42',
      permissionCheck: 'pass',
      scope: '软件工程 · 本地草稿',
      sections: [
        {
          claims: [],
          code: '1',
          id: 'PKG-LOCAL-42-section-overview',
          referenceCount: 0,
          status: 'blocked',
          summary: '等待选择来源快照并生成章节内容。',
          title: '支撑包概览',
        },
      ],
      sensitiveContentCheck: 'pass',
      sourceSnapshots: [],
      status: 'draft',
      template: {
        id: 'template-capstone',
        kind: 'capstone',
        name: '毕业设计支撑',
        version: 'v1.0',
      },
      title: '毕业设计认证支撑包',
      updatedAt: new Date(createdAt).toLocaleString('zh-CN'),
      version: 'v0.1',
    });
  });
});
