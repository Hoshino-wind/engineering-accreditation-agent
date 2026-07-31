import {
  AuditOutlined,
  SettingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Space, Tabs } from 'antd';

import type { WorkflowEvent } from '../../../entities/workflow-event';
import { ModelDataPolicyControls } from '../../../features/configure-model-data-policy';
import { usePrototypeOnlyRoleAssignments } from '../../../features/manage-role-assignments';
import { AuditEventsPanel } from './AuditEventsPanel';
import { GovernanceSummary } from './GovernanceSummary';
import { RoleAssignmentsPanel } from './RoleAssignmentsPanel';

import './governanceWorkbench.css';

interface GovernanceWorkbenchProps {
  workflowEvents: readonly WorkflowEvent[];
}

export function GovernanceWorkbench({
  workflowEvents,
}: GovernanceWorkbenchProps) {
  const {
    assignments,
    createAssignment,
    toggleAssignmentStatus,
  } = usePrototypeOnlyRoleAssignments();

  return (
    <>
      <GovernanceSummary
        assignments={assignments}
        workflowEvents={workflowEvents}
      />
      <Tabs
        className="governance-tabs"
        items={[
          {
            key: 'users',
            label: (
              <Space size={6}>
                <TeamOutlined />
                用户与权限
              </Space>
            ),
            children: (
              <RoleAssignmentsPanel
                assignments={assignments}
                onCreate={createAssignment}
                onToggleStatus={toggleAssignmentStatus}
              />
            ),
          },
          {
            key: 'audit',
            label: (
              <Space size={6}>
                <AuditOutlined />
                审计与风险
              </Space>
            ),
            children: (
              <AuditEventsPanel workflowEvents={workflowEvents} />
            ),
          },
          {
            key: 'model-policy',
            label: (
              <Space size={6}>
                <SettingOutlined />
                模型数据策略
              </Space>
            ),
            children: <ModelDataPolicyControls />,
          },
        ]}
      />
    </>
  );
}
