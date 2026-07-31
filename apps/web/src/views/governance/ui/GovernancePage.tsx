import { SafetyCertificateOutlined } from '@ant-design/icons';
import { Alert, Space, Tag, Typography } from 'antd';

import { useWorkflowEvents } from '../../../entities/workflow-event';
import { ExportWorkflowEventsButton } from '../../../features/export-workflow-events';
import { GovernanceWorkbench } from '../../../widgets/governance-workbench';

const { Paragraph, Title } = Typography;

export function GovernancePage() {
  const workflowEvents = useWorkflowEvents();

  return (
    <div className="governance-page">
      <div className="governance-page-header">
        <div>
          <Space align="center" size={10}>
            <Title level={2}>系统治理与审计</Title>
            <Tag color="blue">治理与审计</Tag>
            <Tag color="success">本地策略已启用</Tag>
          </Space>
          <Paragraph type="secondary">
            管理身份、角色、专业与课程数据范围，并追踪关键业务操作。
          </Paragraph>
        </div>
        <ExportWorkflowEventsButton
          events={workflowEvents}
          label="导出审计记录"
        />
      </div>

      <Alert
        className="governance-notice"
        description="当前提供可运行的本地角色、数据范围、审计和模型策略。学校 OIDC 登录仍需提供身份平台地址、Client ID 和回调白名单后才能完成真实接入。"
        icon={<SafetyCertificateOutlined />}
        showIcon
        title="默认拒绝：业务读取、审核、下载和导出必须同时满足角色与数据范围"
        type="info"
      />

      <GovernanceWorkbench workflowEvents={workflowEvents} />
    </div>
  );
}
