import {
  CheckCircleOutlined,
  FileTextOutlined,
  NodeIndexOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Card, Col, Row, Space, Statistic, Typography } from 'antd';

import type { TeachingResource } from '../../../entities/teaching-resource';

interface TeachingResourceSummaryProps {
  resources: TeachingResource[];
}

export function TeachingResourceSummary({
  resources,
}: TeachingResourceSummaryProps) {
  const ready = resources.filter((item) => item.status === 'ready').length;
  const fragments = resources.reduce(
    (total, item) => total + item.evidenceFragments.length,
    0,
  );
  const exceptions = resources.filter((item) =>
    ['failed', 'quarantined', 'awaitingClassification'].includes(item.status),
  ).length;
  const courses = new Set(resources.map((item) => item.course)).size;
  const summary = [
    {
      key: 'total',
      label: '本地材料',
      value: resources.length,
      suffix: '份',
      detail: `覆盖 ${courses} 门课程`,
      icon: FileTextOutlined,
      tone: 'blue',
    },
    {
      key: 'ready',
      label: '可引用材料',
      value: ready,
      suffix: '份',
      detail:
        resources.length > 0
          ? `处理完成率 ${Math.round((ready / resources.length) * 100)}%`
          : '等待上传材料',
      icon: CheckCircleOutlined,
      tone: 'green',
    },
    {
      key: 'fragments',
      label: '证据片段',
      value: fragments,
      suffix: '条',
      detail: '保留来源坐标与哈希',
      icon: NodeIndexOutlined,
      tone: 'geekblue',
    },
    {
      key: 'exceptions',
      label: '待处理异常',
      value: exceptions,
      suffix: '项',
      detail: exceptions > 0 ? '可在材料详情中查看或重试' : '当前无异常',
      icon: WarningOutlined,
      tone: 'orange',
    },
  ] as const;

  return (
    <Row className="teaching-resource-summary" gutter={16}>
      {summary.map((item) => (
        <Col key={item.key} span={6}>
          <Card size="small">
            <Space align="start" size={12}>
              <div
                className={`teaching-resource-summary-icon teaching-resource-summary-icon--${item.tone}`}
              >
                <item.icon />
              </div>
              <div>
                <Statistic
                  suffix={item.suffix}
                  title={item.label}
                  value={item.value}
                />
                <Typography.Text type="secondary">
                  {item.detail}
                </Typography.Text>
              </div>
            </Space>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
