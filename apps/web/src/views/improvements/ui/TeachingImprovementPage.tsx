import {
  InfoCircleOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';

import { ImprovementSummary } from '../../../widgets/improvement-summary';
import { ImprovementWorkbench } from '../../../widgets/improvement-workbench';

import './teachingImprovementPage.css';

const { Paragraph, Title } = Typography;

export function TeachingImprovementPage() {
  return (
    <main className="teaching-improvement-page">
      <div className="teaching-improvement-page-header">
        <div>
          <Space align="center" size={10}>
            <Title level={2}>教学优化与持续改进</Title>
            <Tag color="geekblue">M7 教学改进</Tag>
            <Tag>试点示例数据</Tag>
          </Space>
          <Paragraph type="secondary">
            将诊断与评价问题落实为实际教学变更，并通过后续复评判断措施是否有效。
          </Paragraph>
        </div>
        <Tooltip title="正式问题创建将在 M7 后端业务切片接入">
          <Button disabled icon={<PlusCircleOutlined />} type="primary">
            新建改进问题
          </Button>
        </Tooltip>
      </div>

      <Alert
        className="teaching-improvement-notice"
        description="当前 6 个改进问题中，2 个措施执行中、1 个等待复评、1 个等待有效性判断；只有实际变更、图谱更新和复评结论完整后才可申请关闭。页面业务数量均为试点示例数据。"
        icon={<InfoCircleOutlined />}
        showIcon
        title="当前重点：措施完成不等于问题关闭"
        type="warning"
      />

      <ImprovementSummary />
      <ImprovementWorkbench />
    </main>
  );
}
