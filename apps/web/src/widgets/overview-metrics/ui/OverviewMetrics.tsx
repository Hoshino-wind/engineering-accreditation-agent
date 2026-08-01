import {
  AuditOutlined,
  DashboardOutlined,
  SafetyCertificateOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { Card, Col, Progress, Row, Space, Tag, Typography } from 'antd';
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

type MetricItem = (typeof prototypeOnlyOverviewMetrics)[number];

function HeroMetricCard({ item }: { item: Extract<MetricItem, { hero: true }> }) {
  const tag = toneLabel[item.tone] ?? defaultToneLabel;

  return (
    <Card
      className={`metric-card metric-card--hero metric-card--${item.tone} reveal-item`}
      bordered={false}
    >
      <div className="metric-card-inner">
        <div className="metric-hero-bg" aria-hidden />
        <div className="metric-hero-content">
          <div className="metric-hero-top">
            <Space align="center" size={10}>
              <span className="metric-icon-badge metric-icon-badge--hero">
                {metricIcons[item.key]}
              </span>
              <Tag className={`metric-tag ${tag.cls}`} bordered={false}>
                {tag.text}
              </Tag>
            </Space>
            <span className="metric-hero-progress-label">
              {item.progressLabel} · {item.progress}%
            </span>
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
              strokeColor={{ from: '#3b5bdb', to: '#7c3aed' }}
              trailColor="rgba(255, 255, 255, 0.35)"
              size={[0, 6]}
            />
            <div className="metric-hero-progress-ticks" aria-hidden>
              {Array.from({ length: 10 }).map((_, i) => (
                <span key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function SmallMetricCard({ item }: { item: MetricItem }) {
  const display = (item as any).displayValue ?? item.value;
  const suffix = (item as any).displaySuffix ?? item.suffix;
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

        <div className="metric-card-halo" aria-hidden />
      </div>
    </Card>
  );
}

export function OverviewMetrics() {
  const heroItem = prototypeOnlyOverviewMetrics.find(
    (m) => (m as any).hero === true,
  ) as Extract<MetricItem, { hero: true }> | undefined;
  const smallItems = prototypeOnlyOverviewMetrics.filter(
    (m) => !(m as any).hero,
  );

  return (
    <div className="metrics-grid">
      {heroItem && (
        <div className="metrics-grid-hero">
          <HeroMetricCard item={heroItem} />
        </div>
      )}
      <div className="metrics-grid-smalls">
        {smallItems.map((item) => (
          <SmallMetricCard key={item.key} item={item} />
        ))}
      </div>
    </div>
  );
}
