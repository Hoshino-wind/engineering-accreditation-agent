import { describe, expect, it } from 'vitest';

import {
  countBlockedWorkflowEvents,
  filterWorkflowEvents,
  type WorkflowEvent,
} from '../index';

const events: WorkflowEvent[] = [
  {
    id: 'event-1',
    module: 'M2',
    action: '发布图谱版本',
    objectId: 'graph-v2',
    summary: '正式版本发布成功',
    actor: '王老师',
    status: 'success',
    timestamp: '2026-07-30T02:00:00.000Z',
  },
  {
    id: 'event-2',
    module: 'M9',
    action: '导出审计记录',
    objectId: 'audit-export-1',
    summary: '已导出 12 条审计事件',
    actor: 'Audit User',
    status: 'blocked',
    timestamp: '2026-07-30T01:00:00.000Z',
  },
  {
    id: 'event-3',
    module: 'M9',
    action: '撤销授权',
    objectId: 'teacher@example.edu.cn',
    summary: '课程负责人授权已撤销',
    actor: '王老师',
    status: 'blocked',
    timestamp: '2026-07-30T00:00:00.000Z',
  },
];

describe('workflow event selectors', () => {
  it('按模块与关键词的 AND 关系筛选，并保留原有顺序', () => {
    const result = filterWorkflowEvents(events, {
      keyword: ' AUDIT USER ',
      module: 'M9',
    });

    expect(result.map((event) => event.id)).toEqual(['event-2']);
  });

  it('all 与空关键词返回全部事件', () => {
    expect(
      filterWorkflowEvents(events, { keyword: '   ', module: 'all' }),
    ).toEqual(events);
  });

  it('关键词只匹配动作、对象、摘要和操作者', () => {
    expect(
      filterWorkflowEvents(events, { keyword: 'M2', module: 'all' }),
    ).toEqual([]);
    expect(
      filterWorkflowEvents(events, {
        keyword: 'TEACHER@EXAMPLE.EDU.CN',
        module: 'all',
      }).map((event) => event.id),
    ).toEqual(['event-3']);
  });

  it('统计 blocked 状态事件', () => {
    expect(countBlockedWorkflowEvents(events)).toBe(2);
  });
});
