import {
  InfoCircleOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';

import { RecognitionSummary } from '../../../widgets/recognition-summary';
import { RecognitionWorkbench } from '../../../widgets/recognition-workbench';

import './recognitionReviewPage.css';

const { Paragraph, Title } = Typography;

export function RecognitionReviewPage() {
  return (
    <main className="recognition-review-page">
      <div className="recognition-review-page-header">
        <div>
          <Space align="center" size={10}>
            <Title level={2}>智能识别与映射审核</Title>
            <Tag color="geekblue">M4 识别与审核</Tag>
            <Tag>试点示例数据</Tag>
          </Space>
          <Paragraph type="secondary">
            在原文、候选建议与正式图谱之间完成可追溯的人工审核。
          </Paragraph>
        </div>
        <Tooltip title="识别任务将在 M4 后端业务切片接入">
          <Button disabled icon={<PlayCircleOutlined />} type="primary">
            运行识别
          </Button>
        </Tooltip>
      </div>

      <Alert
        className="recognition-review-notice"
        description="本轮识别发现 27 条待审核候选，其中 7 条为高影响关系、4 条存在冲突；请先处理风险项，再提交正式图谱。页面业务数量均为试点示例数据。"
        icon={<InfoCircleOutlined />}
        showIcon
        title="当前重点：优先处理冲突、低置信度和高影响关系"
        type="warning"
      />

      <RecognitionSummary />
      <RecognitionWorkbench />
    </main>
  );
}
