import { Badge, Card, Flex, Space, Tag, Typography } from 'antd';

import { SystemStatusList } from '../../../entities/system-status';
import { prototypeOnlyReadiness } from '../model/prototypeOnlyReadiness';

export function PilotReadiness() {
  return (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <Card size="small" title="试点发布门槛">
        <Flex className="readiness-list" vertical>
          {prototypeOnlyReadiness.map((item) => (
            <div className="readiness-row" key={item.key}>
              <Space align="start">
                <Badge status={item.status} />
                <div>
                  <Space size={6}>
                    <Tag color="geekblue">{item.module}</Tag>
                    <Typography.Text>{item.title}</Typography.Text>
                  </Space>
                  <br />
                  <Typography.Text type="secondary">
                    {item.description}
                  </Typography.Text>
                </div>
              </Space>
            </div>
          ))}
        </Flex>
      </Card>
      <Card size="small" title="系统运行状态">
        <SystemStatusList />
      </Card>
    </Space>
  );
}
