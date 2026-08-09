import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileDoneOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { Card, Col, Row, Space, Statistic, Typography } from 'antd';
import type { ComponentType } from 'react';

import type { SupportPackage } from '../../../entities/support-package';
import { validateSupportPackage } from '../../../features/validate-support-package';

import './supportSummary.css';

interface SupportSummaryProps {
  packages: SupportPackage[];
}

interface SummaryItem {
  detail: string;
  icon: ComponentType;
  key: string;
  label: string;
  tone: string;
  value: number;
}

export function SupportSummary({ packages }: SupportSummaryProps) {
  const items: SummaryItem[] = [
    {
      detail: '当前周期由实时数据组装',
      icon: FileDoneOutlined,
      key: 'packages',
      label: '支撑包',
      tone: 'blue',
      value: packages.length,
    },
    {
      detail: '存在导出阻断',
      icon: ToolOutlined,
      key: 'changes-required',
      label: '需修正',
      tone: 'orange',
      value: packages.filter(
        (item) => validateSupportPackage(item).blockedCount > 0,
      ).length,
    },
    {
      detail: '等待工作组确认',
      icon: ClockCircleOutlined,
      key: 'review',
      label: '待复核',
      tone: 'purple',
      value: packages.filter(
        (item) => item.status === 'ready-for-review',
      ).length,
    },
    {
      detail: '具备受控导出条件',
      icon: CheckCircleOutlined,
      key: 'approved',
      label: '已批准',
      tone: 'green',
      value: packages.filter((item) => item.status === 'approved').length,
    },
  ];

  return (
    <Row className="support-summary" gutter={16}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Col key={item.key} span={6}>
            <Card size="small">
              <Space align="start" size={12}>
                <div
                  className={`support-summary-icon support-summary-icon--${item.tone}`}
                >
                  <Icon />
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
        );
      })}
    </Row>
  );
}
