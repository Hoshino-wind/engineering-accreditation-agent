import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearWorkflowEvents,
  readWorkflowEvents,
  recordWorkflowEvent,
} from '../index';

describe('workflowEvents', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('records a versioned local audit event and returns it newest first', () => {
    const recorded = recordWorkflowEvent({
      action: '确认识别候选',
      actor: '测试用户',
      module: 'M4',
      objectId: 'candidate-001',
      status: 'success',
      summary: '接受候选关系',
    });

    const events = readWorkflowEvents();

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(recorded);
    expect(recorded.id).toBeTruthy();
    expect(Number.isNaN(Date.parse(recorded.timestamp))).toBe(false);
  });

  it('keeps the audit trail bounded to the latest 200 events', () => {
    for (let index = 0; index < 205; index += 1) {
      recordWorkflowEvent({
        action: '测试事件',
        actor: '测试用户',
        module: 'M9',
        objectId: `event-${index}`,
        status: 'pending',
        summary: `事件 ${index}`,
      });
    }

    const events = readWorkflowEvents();

    expect(events).toHaveLength(200);
    expect(events[0]?.objectId).toBe('event-204');
    expect(events.at(-1)?.objectId).toBe('event-5');
  });

  it('clears stored events and notifies active consumers', () => {
    const listener = vi.fn();
    window.addEventListener(
      'engineering-accreditation:workflow-events-updated',
      listener,
    );
    recordWorkflowEvent({
      action: '测试事件',
      actor: '测试用户',
      module: 'M2',
      objectId: 'graph-v1',
      status: 'success',
      summary: '发布图谱',
    });

    clearWorkflowEvents();

    expect(readWorkflowEvents()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(2);
    window.removeEventListener(
      'engineering-accreditation:workflow-events-updated',
      listener,
    );
  });
});
