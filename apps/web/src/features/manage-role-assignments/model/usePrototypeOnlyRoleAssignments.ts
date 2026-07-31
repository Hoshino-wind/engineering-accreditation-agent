import { useCallback } from 'react';

import {
  prototypeOnlyRoleAssignments,
  type RoleAssignment,
} from '../../../entities/role-assignment';
import { recordWorkflowEvent } from '../../../entities/workflow-event';
import { useLocalStorageState } from '../../../shared/lib';
import {
  createPendingRoleAssignment,
  type RoleAssignmentInput,
} from './roleAssignmentInput';

const storageKey = 'engineering-accreditation.governance.assignments.v1';

export function usePrototypeOnlyRoleAssignments() {
  const [assignments, setAssignments] = useLocalStorageState<
    RoleAssignment[]
  >(storageKey, prototypeOnlyRoleAssignments);

  const createAssignment = useCallback(
    (values: RoleAssignmentInput) => {
      const nextAssignment = createPendingRoleAssignment(values);
      setAssignments((current) => [...current, nextAssignment]);
      recordWorkflowEvent({
        module: 'M9',
        action: '创建角色授权',
        objectId: nextAssignment.account,
        summary: `${nextAssignment.name} 获得“${nextAssignment.role}”待确认授权`,
        actor: '王老师',
        status: 'pending',
      });
      return nextAssignment;
    },
    [setAssignments],
  );

  const toggleAssignmentStatus = useCallback(
    (assignment: RoleAssignment) => {
      setAssignments((current) =>
        current.map((item) =>
          item.id === assignment.id
            ? {
                ...item,
                status:
                  item.status === 'revoked' ? 'active' : 'revoked',
              }
            : item,
        ),
      );
      recordWorkflowEvent({
        module: 'M9',
        action:
          assignment.status === 'revoked' ? '恢复授权' : '撤销授权',
        objectId: assignment.account,
        summary: `${assignment.name} 的“${assignment.role}”授权已${
          assignment.status === 'revoked' ? '恢复' : '撤销'
        }`,
        actor: '王老师',
        status: 'success',
      });
    },
    [setAssignments],
  );

  return {
    assignments,
    createAssignment,
    toggleAssignmentStatus,
  };
}
