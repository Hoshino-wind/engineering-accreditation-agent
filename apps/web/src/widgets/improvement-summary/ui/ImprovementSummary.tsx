import { Card, Col, Row, Space, Statistic, Typography } from 'antd';

import { prototypeOnlyImprovementSummary } from '../model/prototypeOnlyImprovementSummary';

import './improvementSummary.css';

export function ImprovementSummary() {
  return (
    <Row className="improvement-summary" gutter={16}>
      {prototypeOnlyImprovementSummary.map((item) => (
        <Col key={item.key} span={6}>
          <Card size="small">
            <Space align="start" size={12}>
              <div
                className={`improvement-summary-icon improvement-summary-icon--${item.tone}`}
              >
                <item.icon />
              </div>
              <div>
                <Statistic
                  suffix="项"
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
