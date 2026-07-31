import type {
  RoleAssignment,
  GovernanceRole,
} from '../../../entities/role-assignment';

export interface RoleAssignmentInput {
  name: string;
  account: string;
  role: GovernanceRole;
  scope: string;
}

export function createPendingRoleAssignment(
  values: RoleAssignmentInput,
): RoleAssignment {
  return {
    ...values,
    id: `role-${Date.now()}`,
    status: 'pending',
    lastActive: '尚未登录',
  };
}
