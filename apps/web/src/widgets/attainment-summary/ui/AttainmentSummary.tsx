import {
  AppstoreOutlined,
  BlockOutlined,
  CheckCircleOutlined,
  FlagOutlined,
} from '@ant-design/icons';
import { Card, Col, Row, Space, Statistic, Typography } from 'antd';

import type { AttainmentEvaluationSummary } from '../../../entities/attainment-evaluation';
import { buildAttainmentSummary } from '../model/buildAttainmentSummary';

interface AttainmentSummaryProps {
  evaluations: AttainmentEvaluationSummary[];
}

export function AttainmentSummary({
  evaluations,
}: AttainmentSummaryProps) {
  const summary = buildAttainmentSummary(evaluations);
  const items = [
    {
      detail: '当前评价对象总数',
      icon: AppstoreOutlined,
      key: 'evaluations',
      label: '评价对象',
      suffix: '项',
      tone: 'green',
      value: summary.totalCount,
    },
    {
      detail: '可参与计算的对象数量',
      icon: CheckCircleOutlined,
      key: 'ready',
      label: '输入就绪',
      suffix: '项',
      tone: 'blue',
      value: summary.readyCount,
    },
    {
      detail: '存在阻断问题的对象数量',
      icon: BlockOutlined,
      key: 'blocked',
      label: '阻断问题',
      suffix: '项',
      tone: 'red',
      value: summary.blockedCount,
    },
    {
      detail: '已达成目标 / 就绪目标',
      icon: FlagOutlined,
      key: 'achieved',
      label: '已达标目标',
      suffix: `/ ${summary.readyCount}`,
      tone: 'green',
      value: summary.achievedCount,
    },
  ] as const;

  return (
    <Row className="attainment-summary" gutter={16}>
      {items.map((item) => (
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
