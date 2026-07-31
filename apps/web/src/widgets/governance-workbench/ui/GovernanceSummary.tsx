import {
  AuditOutlined,
  CheckCircleOutlined,
  LockOutlined,
  TeamOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Card, Col, Row, Statistic } from 'antd';

import {
  countActiveRoleAssignments,
  countRoleAssignmentScopes,
  type RoleAssignment,
} from '../../../entities/role-assignment';
import {
  countBlockedWorkflowEvents,
  type WorkflowEvent,
} from '../../../entities/workflow-event';

interface GovernanceSummaryProps {
  assignments: RoleAssignment[];
  workflowEvents: readonly WorkflowEvent[];
}

export function GovernanceSummary({
  assignments,
  workflowEvents,
}: GovernanceSummaryProps) {
  const blockedEventCount =
    countBlockedWorkflowEvents(workflowEvents);

  return (
    <Row className="governance-summary" gutter={12}>
      <Col span={6}>
        <Card size="small">
          <Statistic
            prefix={<TeamOutlined />}
            title="授权用户"
            value={countActiveRoleAssignments(assignments)}
            suffix="人"
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card size="small">
          <Statistic
            prefix={<LockOutlined />}
            title="生效数据范围"
            value={countRoleAssignmentScopes(assignments)}
            suffix="个"
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card size="small">
          <Statistic
            prefix={<AuditOutlined />}
            title="本地审计事件"
            value={workflowEvents.length}
            suffix="条"
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card size="small">
          <Statistic
            prefix={
              blockedEventCount > 0 ? (
                <WarningOutlined />
              ) : (
                <CheckCircleOutlined />
              )
            }
            title="高风险待处理"
            value={blockedEventCount}
            suffix="项"
          />
        </Card>
      </Col>
    </Row>
  );
}
