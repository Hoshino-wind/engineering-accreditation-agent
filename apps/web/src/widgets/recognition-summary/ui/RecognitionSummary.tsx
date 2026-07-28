import { Card, Col, Row, Space, Statistic, Typography } from 'antd';

import { prototypeOnlyRecognitionSummary } from '../model/prototypeOnlyRecognitionSummary';
import './recognitionSummary.css';

export function RecognitionSummary() {
  return (
    <Row className="recognition-summary" gutter={16}>
      {prototypeOnlyRecognitionSummary.map((item) => (
        <Col key={item.key} span={6}>
          <Card size="small">
            <Space align="start" size={12}>
              <div
                className={`recognition-summary-icon recognition-summary-icon--${item.tone}`}
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
