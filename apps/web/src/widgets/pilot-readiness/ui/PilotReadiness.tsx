import { Badge, Card, Flex, Space, Typography } from 'antd';

import { SystemStatusList } from '../../../entities/system-status';
import { prototypeOnlyReadiness } from '../model/prototypeOnlyReadiness';


export function PilotReadiness() {
  return (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <Card size="small" title="试点准备度">
        <Flex className="readiness-list" vertical>
          {prototypeOnlyReadiness.map((item) => (
            <div className="readiness-row" key={item.key}>
              <Space align="start">
                <Badge status={item.status} />
                <div>
                  <Typography.Text>{item.title}</Typography.Text>
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
      <Card size="small" title="服务状态">
        <SystemStatusList />
      </Card>
    </Space>
  );
}
