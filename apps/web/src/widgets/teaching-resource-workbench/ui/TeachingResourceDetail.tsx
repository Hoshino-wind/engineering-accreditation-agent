import {
  CheckCircleFilled,
  ClockCircleOutlined,
  CloseCircleFilled,
  EyeOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Progress,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';

import {
  TeachingResourceSensitivityTag,
  TeachingResourceStatusTag,
  type ProcessingStageStatus,
  type TeachingResource,
} from '../../../entities/teaching-resource';

interface TeachingResourceDetailProps {
  onInspectSource: () => void;
  resource: TeachingResource | null;
}

const processingStageIcon: Record<ProcessingStageStatus, React.ReactNode> = {
  finish: <CheckCircleFilled className="resource-stage-icon--finish" />,
  process: <SyncOutlined className="resource-stage-icon--process" spin />,
  wait: <ClockCircleOutlined className="resource-stage-icon--wait" />,
  error: <CloseCircleFilled className="resource-stage-icon--error" />,
};

export function TeachingResourceDetail({
  onInspectSource,
  resource,
}: TeachingResourceDetailProps) {
  if (!resource) {
    return (
      <Card className="teaching-resource-detail" size="small" title="材料详情">
        <Empty
          description="请调整筛选条件或选择一份材料"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  return (
    <Card
      className="teaching-resource-detail"
      size="small"
      title="材料详情"
      extra={<TeachingResourceStatusTag status={resource.status} />}
    >
      <div className="resource-detail-heading">
        <Typography.Title level={4}>{resource.name}</Typography.Title>
        <Space size={6}>
          <Tag color="blue">{resource.resourceType}</Tag>
          <TeachingResourceSensitivityTag
            sensitivity={resource.sensitivity}
          />
        </Space>
      </div>

      {resource.failureReason ? (
        <Alert
          description={resource.failureReason}
          showIcon
          title={
            resource.status === 'quarantined' ? '材料已隔离' : '处理异常'
          }
          type="error"
        />
      ) : null}

      <Descriptions
        className="resource-detail-descriptions"
        column={2}
        items={[
          {
            key: 'file',
            label: '文件',
            children: `${resource.format} · ${resource.size}`,
          },
          {
            key: 'version',
            label: '版本',
            children: resource.version,
          },
          {
            key: 'course',
            label: '所属课程',
            children: resource.course,
          },
          {
            key: 'owner',
            label: '负责人',
            children: resource.owner,
          },
          {
            key: 'updatedAt',
            label: '更新时间',
            span: 2,
            children: resource.updatedAt,
          },
          {
            key: 'hash',
            label: '内容哈希',
            span: 2,
            children: (
              <Typography.Text copyable={{ text: resource.hash }}>
                {resource.hash}
              </Typography.Text>
            ),
          },
        ]}
        size="small"
      />

      <div className="resource-detail-section">
        <div className="resource-detail-section-heading">
          <Typography.Text strong>来源质量</Typography.Text>
          <Typography.Text type="secondary">
            {resource.evidenceFragments.length} 个已定位片段
          </Typography.Text>
        </div>
        <Progress
          percent={resource.sourceCoverage}
          status={resource.sourceCoverage < 30 ? 'exception' : 'normal'}
        />
      </div>

      <div className="resource-detail-section">
        <Typography.Text strong>处理流水线</Typography.Text>
        <div className="resource-processing-stages">
          {resource.processingStages.map((stage) => (
            <div className="resource-processing-stage" key={stage.label}>
              {processingStageIcon[stage.status]}
              <div>
                <Typography.Text strong>{stage.label}</Typography.Text>
                <Typography.Text type="secondary">
                  {stage.detail}
                </Typography.Text>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="resource-next-action">
        <Typography.Text type="secondary">建议下一步</Typography.Text>
        <Typography.Text strong>{resource.nextAction}</Typography.Text>
      </div>

      <Space className="resource-detail-actions">
        <Button icon={<EyeOutlined />} onClick={onInspectSource} type="primary">
          查看来源片段
        </Button>
        {resource.status === 'ready' ? (
          <Button href="/recognition">进入 M4 审核</Button>
        ) : (
          <Tooltip title="处理操作将在 M3 后端业务切片接入">
            <Button disabled>处理该材料</Button>
          </Tooltip>
        )}
      </Space>
    </Card>
  );
}
