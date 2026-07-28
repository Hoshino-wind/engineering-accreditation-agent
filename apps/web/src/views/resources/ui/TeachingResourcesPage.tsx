import {
  InfoCircleOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';

import { TeachingResourceSummary } from '../../../widgets/teaching-resource-summary';
import { TeachingResourceWorkbench } from '../../../widgets/teaching-resource-workbench';

import './teachingResourcesPage.css';

const { Paragraph, Title } = Typography;

export function TeachingResourcesPage() {
  return (
    <main className="teaching-resources-page">
      <div className="teaching-resources-page-header">
        <div>
          <Space align="center" size={10}>
            <Title level={2}>教学资源与材料</Title>
            <Tag color="geekblue">M3 教学资源</Tag>
            <Tag>试点示例数据</Tag>
          </Space>
          <Paragraph type="secondary">
            把大纲、指导书、评分表和学生证据转为可定位、可授权的证据资源。
          </Paragraph>
        </div>
        <Tooltip title="文件上传将在 M3 后端业务切片接入">
          <Button disabled icon={<UploadOutlined />} type="primary">
            上传材料
          </Button>
        </Tooltip>
      </div>

      <Alert
        className="teaching-resources-notice"
        description="当前有 2 份材料解析或脱敏失败，1 份材料等待分类确认；异常材料不会进入 M4 智能识别。页面业务数量均为试点示例数据。"
        icon={<InfoCircleOutlined />}
        showIcon
        title="材料治理状态：先处理异常，再进入能力识别"
        type="warning"
      />

      <TeachingResourceSummary />
      <TeachingResourceWorkbench />
    </main>
  );
}
