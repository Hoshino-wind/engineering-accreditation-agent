import type { RoleAssignment } from './roleAssignment';

export function countActiveRoleAssignments(
  assignments: RoleAssignment[],
) {
  return assignments.filter(
    (assignment) => assignment.status === 'active',
  ).length;
}

export function countRoleAssignmentScopes(
  assignments: RoleAssignment[],
) {
  return new Set(assignments.map((assignment) => assignment.scope)).size;
}
