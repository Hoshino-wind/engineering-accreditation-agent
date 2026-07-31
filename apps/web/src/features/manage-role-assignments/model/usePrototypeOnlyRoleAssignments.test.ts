import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { readWorkflowEvents } from '../../../entities/workflow-event';
import { usePrototypeOnlyRoleAssignments } from '../index';

describe('usePrototypeOnlyRoleAssignments', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('creates a pending assignment and records one M9 workflow event', () => {
    const { result } = renderHook(() =>
      usePrototypeOnlyRoleAssignments(),
    );

    act(() => {
      result.current.createAssignment({
        account: 'test@example.edu.cn',
        name: '测试教师',
        role: '教师',
        scope: '数据结构 · 2025 秋',
      });
    });

    expect(result.current.assignments).toHaveLength(6);
    expect(result.current.assignments.at(-1)).toMatchObject({
      account: 'test@example.edu.cn',
      lastActive: '尚未登录',
      status: 'pending',
    });
    expect(readWorkflowEvents()).toHaveLength(1);
    expect(readWorkflowEvents()[0]).toMatchObject({
      action: '创建角色授权',
      module: 'M9',
      objectId: 'test@example.edu.cn',
      status: 'pending',
    });
  });

  it('revokes an active assignment through the feature public API', () => {
    const { result } = renderHook(() =>
      usePrototypeOnlyRoleAssignments(),
    );
    const assignment = result.current.assignments[0];

    expect(assignment).toBeDefined();
    if (!assignment) {
      return;
    }

    act(() => {
      result.current.toggleAssignmentStatus(assignment);
    });

    expect(result.current.assignments[0]?.status).toBe('revoked');
    expect(readWorkflowEvents()[0]?.action).toBe('撤销授权');
  });
});
