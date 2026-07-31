import {
  ArrowRightOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Col,
  Row,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useNavigate } from 'react-router';

import {
  getPrimaryGraphPipelineStage,
  GraphPipeline,
} from '../../../widgets/graph-pipeline';
import { GraphQuality } from '../../../widgets/graph-quality';
import { OverviewMetrics } from '../../../widgets/overview-metrics';
import { PilotReadiness } from '../../../widgets/pilot-readiness';
import { RecentActivity } from '../../../widgets/recent-activity';
import { WorkQueue } from '../../../widgets/work-queue';
import './overviewPage.css';

const { Paragraph, Title } = Typography;

export function OverviewPage() {
  const navigate = useNavigate();
  const primaryStage = getPrimaryGraphPipelineStage();

  return (
    <div className="overview-page">
      <div className="overview-page-header">
        <div>
          <Space align="center" size={10}>
            <Title level={2}>实验教学能力工作台</Title>
            <Tag color="geekblue">计算机科学与技术</Tag>
            <Tag>试点示例数据</Tag>
          </Space>
          <Paragraph type="secondary">
            先处理当前阻断，再沿能力培养与评价路径完成诊断、改进和复评。
          </Paragraph>
        </div>
        <Button
          icon={<ArrowRightOutlined />}
          onClick={() => navigate(primaryStage?.route ?? '/graph')}
          type="primary"
        >
          {primaryStage?.actionLabel ?? '查看正式能力图谱'}
        </Button>
      </div>

      <Alert
        className="overview-notice"
        description={
          primaryStage
            ? `${primaryStage.description}。完成后系统会按“正式图谱—能力诊断—达成度评价—教学改进”继续给出下一步。`
            : '当前主流程没有待处理阻断，可以进入正式图谱核对已发布事实。'
        }
        icon={<InfoCircleOutlined />}
        showIcon
        title={`当前下一步：${primaryStage?.title ?? '核对正式图谱'}`}
        type="warning"
      />

      <OverviewMetrics />

      <section className="overview-section">
        <GraphPipeline />
      </section>

      <Row className="overview-section" gutter={16} align="stretch">
        <Col span={16}>
          <WorkQueue />
        </Col>
        <Col span={8}>
          <GraphQuality />
        </Col>
      </Row>

      <Row className="overview-section" gutter={16} align="stretch">
        <Col span={8}>
          <PilotReadiness />
        </Col>
        <Col span={16}>
          <RecentActivity />
        </Col>
      </Row>
    </div>
  );
}
