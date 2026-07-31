import { describe, expect, it } from 'vitest';

import type { WorkflowEvent } from '../../../entities/workflow-event';
import {
  getWorkflowEventsCsvFilename,
  serializeWorkflowEventsCsv,
} from '../index';

const event: WorkflowEvent = {
  id: 'event-1',
  module: 'M9',
  action: '导出"审计"记录',
  objectId: 'audit-export-1',
  summary: '=SUM(1,2)',
  actor: '王老师',
  status: 'success',
  timestamp: '2026-07-30T02:00:00.000Z',
};

describe('workflow events CSV', () => {
  it('生成带 BOM、固定列和全字段引号的 CSV', () => {
    expect(serializeWorkflowEventsCsv([event])).toBe(
      '\uFEFF"时间","模块","动作","对象","摘要","操作者","状态"\n' +
        '"2026-07-30T02:00:00.000Z","M9","导出""审计""记录",' +
        '"audit-export-1","=SUM(1,2)","王老师","success"',
    );
  });

  it('空事件列表仍保留表头', () => {
    expect(serializeWorkflowEventsCsv([])).toBe(
      '\uFEFF"时间","模块","动作","对象","摘要","操作者","状态"',
    );
  });

  it('使用 UTC 日期生成当前文件名', () => {
    expect(
      getWorkflowEventsCsvFilename(
        new Date('2026-07-30T23:59:59.000Z'),
      ),
    ).toBe('audit-events-2026-07-30.csv');
  });
});
