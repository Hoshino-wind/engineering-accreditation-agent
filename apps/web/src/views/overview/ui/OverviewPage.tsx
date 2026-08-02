import {
  ArrowRightOutlined,
  ExclamationOutlined,
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
  getNextGraphPipelineStage,
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
  const nextStage = getNextGraphPipelineStage(primaryStage);

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
        icon={<ExclamationOutlined />}
        showIcon
        title={
          <div className="overview-notice-flow">
            <div className="overview-notice-segment">
              <span className="overview-notice-label">当前步骤</span>
              <Space align="center" size={8}>
                <strong>{primaryStage?.title ?? '核对正式图谱'}</strong>
                <Tag color="orange">阻断中</Tag>
              </Space>
              <span className="overview-notice-detail">
                {primaryStage?.description ?? '当前主流程没有待处理阻断'}
              </span>
            </div>
            <ArrowRightOutlined
              aria-hidden
              className="overview-notice-connector"
            />
            <div className="overview-notice-segment">
              <span className="overview-notice-label">下一步</span>
              <strong>{nextStage?.title ?? '正式图谱'}</strong>
              <span className="overview-notice-detail">
                完成当前审核后，将继续进入正式能力图谱构建阶段。
              </span>
            </div>
            <Button
              onClick={() => navigate(primaryStage?.route ?? '/graph')}
            >
              进入{primaryStage?.title ?? '正式图谱'}
              <ArrowRightOutlined aria-hidden />
            </Button>
          </div>
        }
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
