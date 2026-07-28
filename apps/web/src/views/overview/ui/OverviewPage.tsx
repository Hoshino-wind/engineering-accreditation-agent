import { CloudUploadOutlined, InfoCircleOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Col,
  Row,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';

import { EvidenceProgress } from '../../../widgets/evidence-progress';
import { OverviewMetrics } from '../../../widgets/overview-metrics';
import { PilotReadiness } from '../../../widgets/pilot-readiness';
import { RecentActivity } from '../../../widgets/recent-activity';
import { WorkQueue } from '../../../widgets/work-queue';
import './overviewPage.css';

const { Paragraph, Title } = Typography;

export function OverviewPage() {
  return (
    <main className="overview-page">
      <div className="overview-page-header">
        <div>
          <Space align="center" size={10}>
            <Title level={2}>认证证据总览</Title>
            <Tag color="blue">试点示例数据</Tag>
          </Space>
          <Paragraph type="secondary">
            汇总材料、支撑关系、评价状态和持续改进事项。
          </Paragraph>
        </div>
        <Tooltip title="材料上传将在下一业务切片接入">
          <Button disabled icon={<CloudUploadOutlined />} type="primary">
            导入材料
          </Button>
        </Tooltip>
      </div>

      <Alert
        className="overview-notice"
        description="页面中的业务数量均为显式标记的试点示例；服务状态来自真实 API 契约。"
        icon={<InfoCircleOutlined />}
        showIcon
        title="当前为基础工程阶段"
        type="info"
      />

      <OverviewMetrics />

      <section className="overview-section">
        <EvidenceProgress />
      </section>

      <Row className="overview-section" gutter={[20, 20]} align="top">
        <Col xl={16} xxl={14}>
          <WorkQueue />
        </Col>
        <Col xl={8} xxl={5}>
          <PilotReadiness />
        </Col>
        <Col xl={16} xxl={5}>
          <RecentActivity />
        </Col>
      </Row>
    </main>
  );
}
