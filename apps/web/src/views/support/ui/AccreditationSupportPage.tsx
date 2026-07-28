import {
  FileAddOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';

import { SupportSummary } from '../../../widgets/support-summary';
import { SupportWorkbench } from '../../../widgets/support-workbench';

import './accreditationSupportPage.css';

const { Paragraph, Title } = Typography;

export function AccreditationSupportPage() {
  return (
    <main className="accreditation-support-page">
      <div className="accreditation-support-page-header">
        <div>
          <Space align="center" size={10}>
            <Title level={2}>工程认证支撑</Title>
            <Tag color="geekblue">M8 认证支撑</Tag>
            <Tag>试点示例数据</Tag>
          </Space>
          <Paragraph type="secondary">
            从已确认的图谱、评价与改进事实生成可追溯、可校验的认证支撑材料。
          </Paragraph>
        </div>
        <Tooltip title="正式支撑包创建将在 M8 reporting 后端业务切片接入">
          <Button disabled icon={<FileAddOutlined />} type="primary">
            新建支撑包
          </Button>
        </Tooltip>
      </div>

      <Alert
        className="accreditation-support-notice"
        description="当前 5 个支撑包中，2 个需要修正、1 个待复核、1 个已批准；未批准评价、未闭环改进或失效引用必须返回事实所属模块处理后才能导出。页面业务数量均为试点示例数据。"
        icon={<InfoCircleOutlined />}
        showIcon
        title="当前重点：报告不能覆盖上游正式事实"
        type="warning"
      />

      <SupportSummary />
      <SupportWorkbench />
    </main>
  );
}
