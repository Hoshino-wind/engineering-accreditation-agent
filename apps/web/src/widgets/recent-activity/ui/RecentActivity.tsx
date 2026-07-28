import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { Card, Space, Tag, Timeline, Typography } from 'antd';
import type { ReactNode } from 'react';

import { prototypeOnlyActivities } from '../model/prototypeOnlyActivities';
import './recentActivity.css';

const tonePresentation: Record<
  (typeof prototypeOnlyActivities)[number]['tone'],
  { color: string; icon: ReactNode }
> = {
  success: {
    color: 'green',
    icon: <CheckCircleOutlined />,
  },
  warning: {
    color: 'orange',
    icon: <ExclamationCircleOutlined />,
  },
  info: {
    color: 'blue',
    icon: <ClockCircleOutlined />,
  },
};

export function RecentActivity() {
  return (
    <Card className="recent-activity" size="small" title="最近业务活动">
      <Timeline
        items={prototypeOnlyActivities.map((item) => {
          const presentation = tonePresentation[item.tone];

          return {
            color: presentation.color,
            icon: presentation.icon,
            content: (
              <div>
                <div className="recent-activity-header">
                  <Space size={6}>
                    <Tag color="geekblue">{item.module}</Tag>
                    <Typography.Text strong>{item.title}</Typography.Text>
                  </Space>
                  <Typography.Text type="secondary">
                    {item.time}
                  </Typography.Text>
                </div>
                <Typography.Text type="secondary">
                  {item.description}
                </Typography.Text>
              </div>
            ),
          };
        })}
      />
    </Card>
  );
}
