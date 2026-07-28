import { Card, Col, Row, Space, Statistic, Typography } from 'antd';

import { prototypeOnlyResourceSummary } from '../model/prototypeOnlyResourceSummary';
import './teachingResourceSummary.css';

export function TeachingResourceSummary() {
  return (
    <Row className="teaching-resource-summary" gutter={16}>
      {prototypeOnlyResourceSummary.map((item) => (
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
