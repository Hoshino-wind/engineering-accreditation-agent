import {
  AuditOutlined,
  DashboardOutlined,
  SafetyCertificateOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { Card, Progress, Space, Tag, Typography } from 'antd';
import type { ReactNode } from 'react';

import { prototypeOnlyOverviewMetrics } from '../model/prototypeOnlyOverviewMetrics';
import './overviewMetrics.css';

const metricIcons: Record<
  (typeof prototypeOnlyOverviewMetrics)[number]['key'],
  ReactNode
> = {
  standardCoverage: <SafetyCertificateOutlined />,
  avgAttainment: <DashboardOutlined />,
  pendingReview: <AuditOutlined />,
  improvementTasks: <ToolOutlined />,
};

const defaultToneLabel = { text: '观测', cls: 'tag-default' };

const toneLabel: Record<string, { text: string; cls: string }> = {
  primary: { text: '核心指标', cls: 'tag-primary' },
  default: defaultToneLabel,
  warning: { text: '待处理', cls: 'tag-warning' },
  danger: { text: '关注', cls: 'tag-danger' },
};

const closedLoopSteps = [
  { code: 'M3', title: '材料解析', detail: '上传并抽取教学证据' },
  { code: 'M4', title: '关系审核', detail: '教师确认支撑关系' },
  { code: 'M2', title: '正式图谱', detail: '审核通过后写入图谱' },
  { code: 'M5', title: '图谱诊断', detail: '发现缺口和弱支撑' },
  { code: 'M7', title: '教学改进', detail: '形成整改任务闭环' },
];

type MetricItem = (typeof prototypeOnlyOverviewMetrics)[number];
type HeroMetricItem = Extract<MetricItem, { hero: true }>;

function HeroMetricCard({ item }: { item: HeroMetricItem }) {
  const tag = toneLabel[item.tone] ?? defaultToneLabel;

  return (
    <Card
      className={`metric-card metric-card--hero metric-card--${item.tone} reveal-item`}
      bordered={false}
    >
      <div className="metric-card-inner">
        <div className="metric-hero-content">
          <div className="metric-hero-summary">
            <div className="metric-hero-top">
              <Space align="center" size={10}>
                <span className="metric-icon-badge metric-icon-badge--hero">
                  {metricIcons[item.key]}
                </span>
                <Tag className={`metric-tag ${tag.cls}`} bordered={false}>
                  {tag.text}
                </Tag>
              </Space>
              <span className="metric-hero-progress-label">正式覆盖率</span>
            </div>

            <div className="metric-hero-middle">
              <div className="metric-hero-title">{item.title}</div>
              <div className="metric-hero-value-row">
                <span className="metric-hero-number big-number">{item.value}</span>
                <span className="metric-hero-suffix">{item.suffix}</span>
              </div>
              <div className="metric-hero-detail">{item.detail}</div>
            </div>

            <div className="metric-hero-progress">
              <Progress
                percent={item.progress}
                showInfo={false}
                strokeColor="#2f6fed"
                trailColor="#edf1f7"
                size={[0, 8]}
              />
              <div className="metric-hero-progress-caption">
                <Typography.Text type="secondary">
                  目标 100%，未覆盖项会进入 M5 诊断和 M7 改进
                </Typography.Text>
                <Typography.Text strong>{item.progress}%</Typography.Text>
              </div>
            </div>
          </div>

          <div className="metric-hero-flow">
            <div className="metric-hero-flow-header">
              <Typography.Text strong>当前认证闭环</Typography.Text>
              <Tag bordered={false}>MVP 主流程</Tag>
            </div>
            <div className="metric-flow-steps">
              {closedLoopSteps.map((step, index) => (
                <div className="metric-flow-step" key={step.code}>
                  <div className="metric-flow-step-code">{step.code}</div>
                  <div className="metric-flow-step-copy">
                    <Typography.Text strong>{step.title}</Typography.Text>
                    <Typography.Text type="secondary">{step.detail}</Typography.Text>
                  </div>
                  {index < closedLoopSteps.length - 1 ? (
                    <span className="metric-flow-connector" aria-hidden />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function SmallMetricCard({ item }: { item: MetricItem }) {
  const display = 'displayValue' in item ? item.displayValue : item.value;
  const suffix = 'displaySuffix' in item ? item.displaySuffix : item.suffix;
  const tag = toneLabel[item.tone] ?? defaultToneLabel;

  return (
    <Card
      className={`metric-card metric-card--small metric-card--${item.tone} reveal-item`}
      bordered={false}
    >
      <div className="metric-card-inner">
        <div className="metric-small-row metric-small-row--top">
          <span className={`metric-icon-badge metric-icon-badge--${item.tone}`}>
            {metricIcons[item.key]}
          </span>
          <Tag className={`metric-tag ${tag.cls}`} bordered={false}>
            {tag.text}
          </Tag>
        </div>

        <div className="metric-small-title">{item.title}</div>

        <div className="metric-small-value-row">
          <span className="metric-small-number big-number">{display}</span>
          <span className="metric-small-suffix">{suffix}</span>
        </div>

        <div className="metric-small-detail">{item.detail}</div>
      </div>
    </Card>
  );
}

export function OverviewMetrics() {
  const heroItem = prototypeOnlyOverviewMetrics.find(
    (metric): metric is HeroMetricItem => metric.hero === true,
  );
  const smallItems = prototypeOnlyOverviewMetrics.filter(
    (metric) => metric.hero !== true,
  );

  return (
    <div className="metrics-grid">
      {heroItem ? (
        <div className="metrics-grid-hero">
          <HeroMetricCard item={heroItem} />
        </div>
      ) : null}
      <div className="metrics-grid-smalls">
        {smallItems.map((item) => (
          <SmallMetricCard key={item.key} item={item} />
        ))}
      </div>
    </div>
  );
}
