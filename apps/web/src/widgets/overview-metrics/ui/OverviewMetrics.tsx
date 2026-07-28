import { Card, Col, Row, Statistic } from 'antd';

import { prototypeOnlyOverviewMetrics } from '../model/prototypeOnlyOverviewMetrics';
import './overviewMetrics.css';

export function OverviewMetrics() {
  return (
    <Row gutter={20}>
      {prototypeOnlyOverviewMetrics.map((item) => (
        <Col key={item.key} span={6}>
          <Card className="overview-metric-card">
            <Statistic
              prefix={item.icon}
              suffix={item.suffix}
              title={item.title}
              value={item.value}
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
}
