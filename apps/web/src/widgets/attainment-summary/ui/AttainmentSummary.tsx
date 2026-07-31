import { Card, Col, Row, Space, Statistic, Typography } from 'antd';

import { prototypeOnlyAttainmentSummary } from '../model/prototypeOnlyAttainmentSummary';


export function AttainmentSummary() {
  return (
    <Row className="attainment-summary" gutter={16}>
      {prototypeOnlyAttainmentSummary.map((item) => (
        <Col key={item.key} span={6}>
          <Card size="small">
            <Space align="start" size={12}>
              <div
                className={`attainment-summary-icon attainment-summary-icon--${item.tone}`}
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
