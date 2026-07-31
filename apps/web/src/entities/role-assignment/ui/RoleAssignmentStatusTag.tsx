import { Tag } from 'antd';

import {
  roleAssignmentStatusMeta,
  type RoleAssignmentStatus,
} from '../model/roleAssignment';

interface RoleAssignmentStatusTagProps {
  status: RoleAssignmentStatus;
}

export function RoleAssignmentStatusTag({
  status,
}: RoleAssignmentStatusTagProps) {
  const meta = roleAssignmentStatusMeta[status];

  return <Tag color={meta.color}>{meta.label}</Tag>;
}
