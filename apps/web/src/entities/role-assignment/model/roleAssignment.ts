export type GovernanceRole =
  | '教师'
  | '课程负责人'
  | '专业负责人'
  | '认证工作组'
  | '审计人员'
  | '系统管理员';

export type RoleAssignmentStatus = 'active' | 'pending' | 'revoked';

export interface RoleAssignment {
  id: string;
  name: string;
  account: string;
  role: GovernanceRole;
  scope: string;
  status: RoleAssignmentStatus;
  lastActive: string;
}

export const governanceRoles: GovernanceRole[] = [
  '教师',
  '课程负责人',
  '专业负责人',
  '认证工作组',
  '审计人员',
  '系统管理员',
];

export const roleAssignmentStatusMeta: Record<
  RoleAssignmentStatus,
  {
    color: 'default' | 'success' | 'warning';
    label: string;
  }
> = {
  active: { color: 'success', label: '生效中' },
  pending: { color: 'warning', label: '待确认' },
  revoked: { color: 'default', label: '已撤销' },
};
