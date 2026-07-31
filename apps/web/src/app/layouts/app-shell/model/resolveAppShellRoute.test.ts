import { describe, expect, it } from 'vitest';

import { appShellRoutes } from '../config/appShellRoutes';
import {
  getAppShellContentClassName,
  resolveAppShellRoute,
} from './resolveAppShellRoute';

const expectedRoutes = [
  ['/', '实验教学能力图谱', '总览与任务', 'default'],
  [
    '/resources',
    '构建能力图谱',
    '教学资源与材料',
    'workbench',
  ],
  [
    '/recognition',
    '构建能力图谱',
    '智能识别与映射审核',
    'workbench',
  ],
  [
    '/graph',
    '构建能力图谱',
    '实验教学能力图谱',
    'workbench',
  ],
  [
    '/diagnostics',
    '分析与评价',
    '图谱分析与一致性诊断',
    'workbench',
  ],
  [
    '/evaluations',
    '分析与评价',
    '达成度评价与统计',
    'workbench',
  ],
  [
    '/improvements',
    '改进闭环',
    '教学优化与持续改进',
    'workbench',
  ],
  ['/support', '改进闭环', '工程认证支撑', 'workbench'],
  ['/governance', '系统', '身份、权限与审计', 'workbench'],
] as const;

describe('resolveAppShellRoute', () => {
  it.each(expectedRoutes)(
    'resolves %s without changing the route presentation contract',
    (path, areaName, pageName, contentMode) => {
      expect(resolveAppShellRoute(path)).toMatchObject({
        areaName,
        contentMode,
        pageName,
        path,
      });
    },
  );

  it('keeps the navigation order and route set stable', () => {
    expect(appShellRoutes.map((route) => route.path)).toEqual(
      expectedRoutes.map(([path]) => path),
    );
  });

  it('falls back to the overview presentation for an unknown pathname', () => {
    expect(resolveAppShellRoute('/unknown')).toMatchObject({
      areaName: '实验教学能力图谱',
      contentMode: 'default',
      pageName: '总览与任务',
      path: '/',
    });
    expect(getAppShellContentClassName('/unknown')).toBe('app-content');
  });

  it('uses the workbench overflow contract on every non-overview route', () => {
    for (const [path, , , contentMode] of expectedRoutes) {
      expect(getAppShellContentClassName(path)).toBe(
        contentMode === 'workbench'
          ? 'app-content app-content--workbench'
          : 'app-content',
      );
    }
  });
});
