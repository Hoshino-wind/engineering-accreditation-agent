import { Card, Timeline, Typography } from 'antd';

import { prototypeOnlyActivities } from '../model/prototypeOnlyActivities';

export function RecentActivity() {
  return (
    <Card size="small" title="最近活动">
      <Timeline
        items={prototypeOnlyActivities.map((item) => ({
          color: item.color,
          icon: item.icon,
          content: (
            <div>
              <Typography.Text>{item.title}</Typography.Text>
              <br />
              <Typography.Text type="secondary">
                {item.description}
              </Typography.Text>
            </div>
          ),
        }))}
      />
    </Card>
  );
}
