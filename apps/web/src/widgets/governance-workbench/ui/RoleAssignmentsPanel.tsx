import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';

import {
  RoleAssignmentStatusTag,
  type RoleAssignment,
} from '../../../entities/role-assignment';
import {
  CreateRoleAssignmentModal,
  type RoleAssignmentInput,
} from '../../../features/manage-role-assignments';

const { Text } = Typography;

interface RoleAssignmentsPanelProps {
  assignments: RoleAssignment[];
  onCreate: (values: RoleAssignmentInput) => void;
  onToggleStatus: (assignment: RoleAssignment) => void;
}

export function RoleAssignmentsPanel({
  assignments,
  onCreate,
  onToggleStatus,
}: RoleAssignmentsPanelProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const columns = useMemo<ColumnsType<RoleAssignment>>(
    () => [
      {
        title: '用户',
        key: 'user',
        render: (_, assignment) => (
          <div className="governance-user">
            <Text strong>{assignment.name}</Text>
            <Text type="secondary">{assignment.account}</Text>
          </div>
        ),
        width: 220,
      },
      {
        title: '角色',
        dataIndex: 'role',
        key: 'role',
        render: (role: RoleAssignment['role']) => (
          <Tag color="blue">{role}</Tag>
        ),
        width: 130,
      },
      {
        title: '数据范围',
        dataIndex: 'scope',
        key: 'scope',
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: (status: RoleAssignment['status']) => (
          <RoleAssignmentStatusTag status={status} />
        ),
        width: 100,
      },
      {
        title: '最近活动',
        dataIndex: 'lastActive',
        key: 'lastActive',
        width: 120,
      },
      {
        title: '操作',
        key: 'actions',
        render: (_, assignment) => {
          const action =
            assignment.status === 'revoked' ? '恢复' : '撤销';

          return (
            <Button
              aria-label={`${action}${assignment.name}的${assignment.role}授权`}
              onClick={() => onToggleStatus(assignment)}
              size="small"
            >
              {action}
            </Button>
          );
        },
        width: 80,
      },
    ],
    [onToggleStatus],
  );

  return (
    <>
      <Card
        className="governance-tab-card"
        extra={
          <Button
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
            type="primary"
          >
            新增授权
          </Button>
        }
        size="small"
        title="用户、角色与数据范围"
      >
        <Table<RoleAssignment>
          columns={columns}
          dataSource={assignments}
          pagination={false}
          rowKey="id"
          scroll={{ y: 430 }}
          size="small"
        />
      </Card>
      <CreateRoleAssignmentModal
        onClose={() => setModalOpen(false)}
        onCreate={onCreate}
        open={modalOpen}
      />
    </>
  );
}
