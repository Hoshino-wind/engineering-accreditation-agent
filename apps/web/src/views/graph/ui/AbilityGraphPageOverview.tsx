import {
  ApartmentOutlined,
  AuditOutlined,
  CheckCircleOutlined,
  FileSearchOutlined,
  LockOutlined,
  NodeIndexOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Card,
  Col,
  Progress,
  Row,
  Statistic,
  Typography,
} from 'antd';

import type {
  AbilityGraphPublishCheck,
  AbilityGraphQualityMetric,
  AbilityGraphState,
} from '../../../entities/ability-graph';
import type { AbilityGraphView } from '../model/abilityGraphPageModel';

const { Text } = Typography;

const qualityMetricIcons = [
  <ApartmentOutlined key="support" />,
  <NodeIndexOutlined key="teaching" />,
  <AuditOutlined key="assessment" />,
  <FileSearchOutlined key="ready" />,
];

export function AbilityGraphPersistenceNotice({
  error,
}: {
  error: unknown;
}) {
  if (!error) {
    return null;
  }

  return (
    <Alert
      className="ability-graph-notice"
      description={
        error instanceof Error ? error.message : '无法连接能力图谱服务'
      }
      showIcon
      title="服务端状态同步失败"
      type="error"
    />
  );
}

export function AbilityGraphPublishNotice({
  activeView,
  blockingChecks,
  graph,
}: {
  activeView: AbilityGraphView;
  blockingChecks: AbilityGraphPublishCheck[];
  graph: AbilityGraphState;
}) {
  if (activeView === 'capability') {
    return null;
  }

  return (
    <Alert
      className="ability-graph-notice"
      description={
        graph.version.status === 'published'
          ? '该版本已经锁定；任何新增对象、关系或定义变更都必须从新的修订草稿开始。'
          : blockingChecks.length > 0
            ? `当前仍需处理：${blockingChecks.map((check) => check.label).join('、')}。发布不会自动补关系、审核变更或处置下游影响。`
            : 'Schema、覆盖、逐项审核和下游影响处置均满足当前发布门槛。'
      }
      icon={
        graph.version.status === 'published' ? (
          <LockOutlined />
        ) : blockingChecks.length > 0 ? (
          <WarningOutlined />
        ) : (
          <CheckCircleOutlined />
        )
      }
      showIcon
      title={
        graph.version.status === 'published'
          ? '当前为只读发布快照'
          : blockingChecks.length > 0
            ? `${blockingChecks.length} 项发布阻断`
            : '当前图谱可以发布'
      }
      type={
        graph.version.status === 'published'
          ? 'info'
          : blockingChecks.length > 0
            ? 'warning'
            : 'success'
      }
    />
  );
}

export function AbilityGraphQualitySummary({
  activeView,
  qualityMetrics,
}: {
  activeView: AbilityGraphView;
  qualityMetrics: AbilityGraphQualityMetric[];
}) {
  if (activeView === 'capability' || activeView === 'publish') {
    return null;
  }

  return (
    <Row className="ability-graph-summary" gutter={10}>
      {qualityMetrics.map((metric, index) => (
        <Col key={metric.key} span={6}>
          <Card size="small">
            <Statistic
              prefix={qualityMetricIcons[index]}
              title={metric.label}
              value={metric.percent}
              suffix="%"
            />
            <Progress
              percent={metric.percent}
              showInfo={false}
              size="small"
              strokeColor={
                metric.percent === 100
                  ? 'var(--app-success)'
                  : metric.percent >= 50
                    ? 'var(--app-warning)'
                    : 'var(--app-error)'
              }
            />
            <Text type="secondary">
              {metric.current} / {metric.total}
            </Text>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
