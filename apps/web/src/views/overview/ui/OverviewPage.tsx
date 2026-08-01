import {
  ArrowRightOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { Alert, Button, Col, Row, Space, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
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
  const [heroReady, setHeroReady] = useState(false);
  const [metricsReady, setMetricsReady] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setHeroReady(true), 40);
    const t2 = setTimeout(() => setMetricsReady(true), 220);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <main className="overview-page">
      <div className="page-corner-deco" aria-hidden />

      {/* ================== Hero 区：编辑排版不对称布局 ================== */}
      <header className={`page-hero reveal-group ${heroReady ? 'is-ready' : ''}`}>
        <div className="page-hero-left">
          <div className="page-hero-kicker reveal-item">
            <span className="kicker-accent">M1</span>
            <span className="kicker-divider" />
            <span className="kicker-text">总览与任务</span>
            <Tag className="hero-pilot-tag" bordered={false}>
              试点示例数据
            </Tag>
          </div>

          <h1 className="page-title reveal-item">
            实验教学能力图谱总览
          </h1>

          <p className="page-lead reveal-item">
            从教学材料出发，跟踪 <strong>图谱构建 → 诊断 → 评价 → 改进</strong> 的完整闭环。
            所有数值可溯源，每一条支撑关系都有材料片段作为证据。
          </p>
        </div>

        <div className="page-hero-right reveal-item">
          <Button
            size="large"
            type="primary"
            icon={<ArrowRightOutlined />}
            onClick={() => navigate('/support')}
            className="hero-cta"
          >
            进入认证支撑
          </Button>
          <div className="hero-meta">
            <div className="hero-meta-row">
              <span className="hero-meta-dot hero-meta-dot--ok" />
              <span>系统运行状态正常</span>
            </div>
            <div className="hero-meta-row">
              <span className="hero-meta-dot hero-meta-dot--warn" />
              <span>2 个支撑包存在导出阻断</span>
            </div>
          </div>
        </div>
      </header>

      {/* ================== 阶段通知条 ================== */}
      <div className={`notice-block reveal-group ${heroReady ? 'is-ready' : ''}`}>
        <Alert
          className="overview-notice reveal-item"
          description="未批准评价、未闭环改进或失效引用必须返回事实所属模块修正。页面业务数量为试点示例，系统运行状态来自真实 API。"
          icon={<InfoCircleOutlined />}
          showIcon
          title="当前阶段：认证支撑包校验与受控导出准备"
          type="warning"
        />
      </div>

      {/* ================== 指标卡：不对称层级（主卡 + 3 小卡）================== */}
      <section className={`reveal-group ${metricsReady ? 'is-ready' : ''}`}>
        <OverviewMetrics />
      </section>

      {/* ================== 流程进度 ================== */}
      <section className="overview-section reveal-item">
        <GraphPipeline />
      </section>

      {/* ================== 主内容：左大右小 ================== */}
      <Row className="overview-section" gutter={20} align="stretch">
        <Col xs={24} lg={16}>
          <WorkQueue />
        </Col>
        <Col xs={24} lg={8}>
          <GraphQuality />
        </Col>
      </Row>

      <Row className="overview-section" gutter={20} align="stretch">
        <Col xs={24} lg={8}>
          <PilotReadiness />
        </Col>
        <Col xs={24} lg={16}>
          <RecentActivity />
        </Col>
      </Row>
    </main>
  );
}
