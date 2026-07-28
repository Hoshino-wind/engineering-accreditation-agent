import {
  ApartmentOutlined,
  AuditOutlined,
  LinkOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Card, Col, Row, Statistic } from 'antd';
import type { ReactNode } from 'react';

import { prototypeOnlyOverviewMetrics } from '../model/prototypeOnlyOverviewMetrics';
import './overviewMetrics.css';

const metricIcons: Record<
  (typeof prototypeOnlyOverviewMetrics)[number]['key'],
  ReactNode
> = {
  graphNodes: <ApartmentOutlined />,
  graphEdges: <LinkOutlined />,
  candidates: <AuditOutlined />,
  findings: <WarningOutlined />,
};

export function OverviewMetrics() {
  return (
    <Row gutter={16}>
      {prototypeOnlyOverviewMetrics.map((item) => (
        <Col key={item.key} span={6}>
          <Card
            className={`overview-metric-card overview-metric-card--${item.tone}`}
            size="small"
          >
            <Statistic
              prefix={metricIcons[item.key]}
              suffix={item.suffix}
              title={item.title}
              value={item.value}
            />
            <div className="overview-metric-detail">{item.detail}</div>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
