import { Card, Col, Row, Space, Statistic, Typography } from 'antd';

import { prototypeOnlyDiagnosticSummary } from '../model/prototypeOnlyDiagnosticSummary';

export function DiagnosticSummary() {
  return (
    <Row className="diagnostic-summary" gutter={16}>
      {prototypeOnlyDiagnosticSummary.map((item) => (
        <Col key={item.key} span={6}>
          <Card size="small">
            <Space align="start" size={12}>
              <div
                className={`diagnostic-summary-icon diagnostic-summary-icon--${item.tone}`}
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
