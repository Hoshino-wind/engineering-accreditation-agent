import { Card, Col, Row, Space, Statistic, Typography } from 'antd';

import { prototypeOnlySupportSummary } from '../model/prototypeOnlySupportSummary';


export function SupportSummary() {
  return (
    <Row className="support-summary" gutter={16}>
      {prototypeOnlySupportSummary.map((item) => (
        <Col key={item.key} span={6}>
          <Card size="small">
            <Space align="start" size={12}>
              <div
                className={`support-summary-icon support-summary-icon--${item.tone}`}
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
