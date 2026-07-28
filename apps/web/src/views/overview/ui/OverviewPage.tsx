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

import { GraphPipeline } from '../../../widgets/graph-pipeline';
import { GraphQuality } from '../../../widgets/graph-quality';
import { OverviewMetrics } from '../../../widgets/overview-metrics';
import { PilotReadiness } from '../../../widgets/pilot-readiness';
import { RecentActivity } from '../../../widgets/recent-activity';
import { WorkQueue } from '../../../widgets/work-queue';
import './overviewPage.css';

const { Paragraph, Title } = Typography;

export function OverviewPage() {
  const navigate = useNavigate();

  return (
    <main className="overview-page">
      <div className="overview-page-header">
        <div>
          <Space align="center" size={10}>
            <Title level={2}>实验教学能力图谱总览</Title>
            <Tag color="geekblue">M1 总览与任务</Tag>
            <Tag>试点示例数据</Tag>
          </Space>
          <Paragraph type="secondary">
            从教学材料出发，跟踪图谱构建、诊断、评价与教学改进的完整状态。
          </Paragraph>
        </div>
        <Button
          icon={<ArrowRightOutlined />}
          onClick={() => navigate('/support')}
          type="primary"
        >
          进入认证支撑
        </Button>
      </div>

      <Alert
        className="overview-notice"
        description="当前 5 个支撑包中 2 个存在导出阻断；未批准评价、未闭环改进或失效引用必须返回事实所属模块修正。页面业务数量为试点示例，系统运行状态来自真实 API。"
        icon={<InfoCircleOutlined />}
        showIcon
        title="当前阶段：认证支撑包校验与受控导出准备"
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
    </main>
  );
}
