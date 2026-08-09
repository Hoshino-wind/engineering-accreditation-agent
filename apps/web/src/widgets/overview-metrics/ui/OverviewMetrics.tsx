import {
  AuditOutlined,
  DashboardOutlined,
  SafetyCertificateOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { Card, Progress, Space, Tag } from 'antd';
import { useEffect, useState, type ReactNode } from 'react';

import { fetchCoverage } from '../../../shared/api/graphClient';

import './overviewMetrics.css';

type MetricKey =
  | 'standardCoverage'
  | 'avgAttainment'
  | 'pendingReview'
  | 'improvementTasks';

interface MetricItem {
  detail: string;
  displaySuffix?: string;
  displayValue?: string;
  hero: boolean;
  key: MetricKey;
  progress?: number;
  progressLabel?: string;
  suffix: string;
  title: string;
  tone: 'primary' | 'default' | 'warning' | 'danger';
  value: number;
}

const metricIcons: Record<MetricKey, ReactNode> = {
  standardCoverage: <SafetyCertificateOutlined />,
  avgAttainment: <DashboardOutlined />,
  pendingReview: <AuditOutlined />,
  improvementTasks: <ToolOutlined />,
};

const toneLabel: Record<string, { text: string; cls: string }> = {
  primary: { text: '核心指标', cls: 'tag-primary' },
  default: { text: '观测', cls: 'tag-default' },
  warning: { text: '待处理', cls: 'tag-warning' },
  danger: { text: '关注', cls: 'tag-danger' },
};

function HeroMetricCard({ item }: { item: MetricItem }) {
  return (
    <Card
      className={`metric-card metric-card--hero metric-card--${item.tone} reveal-item`}
      variant="borderless"
    >
      <div className="metric-card-inner">
        <div className="metric-hero-bg" aria-hidden />
        <div className="metric-hero-content">
          <div className="metric-hero-top">
            <Space align="center" size={10}>
              <span className="metric-icon-badge metric-icon-badge--hero">
                {metricIcons[item.key]}
              </span>
              <Tag className={`metric-tag ${toneLabel[item.tone]!.cls}`} variant="filled">
                {toneLabel[item.tone]!.text}
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
              railColor="rgba(255, 255, 255, 0.35)"
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
  const display = item.displayValue ?? item.value;
  const suffix = item.displaySuffix ?? item.suffix;
  const tag = (toneLabel[item.tone] ?? toneLabel.default)!;

  return (
    <Card
      className={`metric-card metric-card--small metric-card--${item.tone} reveal-item`}
      variant="borderless"
    >
      <div className="metric-card-inner">
        <div className="metric-small-row metric-small-row--top">
          <span className={`metric-icon-badge metric-icon-badge--${item.tone}`}>
            {metricIcons[item.key]}
          </span>
          <Tag className={`metric-tag ${tag.cls}`} variant="filled">
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
  const [metrics, setMetrics] = useState<MetricItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const cov = await fetchCoverage();
      if (cancelled) return;
      if (!cov) {
        // 后端不可用：展示诚实的零值而不是静态示例数据
        setMetrics([
          {
            key: 'standardCoverage',
            title: '标准覆盖率',
            value: 0,
            suffix: '%',
            detail: '后端未连接，暂无覆盖度数据',
            tone: 'default',
            hero: true,
            progress: 0,
            progressLabel: '已覆盖',
          },
          {
            key: 'avgAttainment',
            title: '达成度均值',
            value: 0,
            suffix: '',
            displayValue: '—',
            displaySuffix: '',
            detail: '后端未连接',
            tone: 'default',
            hero: false,
          },
          {
            key: 'pendingReview',
            title: '待审核指标',
            value: 0,
            suffix: '项',
            detail: '后端未连接',
            tone: 'default',
            hero: false,
          },
          {
            key: 'improvementTasks',
            title: '缺口数',
            value: 0,
            suffix: '项',
            detail: '后端未连接',
            tone: 'default',
            hero: false,
          },
        ]);
        return;
      }
      const rate = Math.round((cov.overallCoverageRate ?? 0) * 100);
      const comps = cov.competencies ?? [];
      const avgAtt = comps.length
        ? Math.round(
            (comps.reduce((s, c) => s + (c.attainment ?? 0), 0) / comps.length) * 100,
          )
        : 0;
      const pendingCount = comps.filter((c) => c.hasPendingReview).length;
      setMetrics([
        {
          key: 'standardCoverage',
          title: '标准覆盖率',
          value: rate,
          suffix: '%',
          detail: `${cov.coveredCount} 项已覆盖 / ${cov.partialCount} 项部分 / ${cov.gapCount} 项缺口`,
          tone: 'primary',
          hero: true,
          progress: rate,
          progressLabel: '已覆盖',
        },
        {
          key: 'avgAttainment',
          title: '达成度均值',
          value: avgAtt / 100,
          suffix: '',
          displayValue: String(avgAtt),
          displaySuffix: '%',
          detail: `${cov.coveredCount} 项达标，${cov.partialCount} 项部分达成`,
          tone: 'default',
          hero: false,
        },
        {
          key: 'pendingReview',
          title: '待审核指标',
          value: pendingCount,
          suffix: '项',
          detail: pendingCount > 0 ? '有待审核的 AI 推断关系' : '全部已审核',
          tone: pendingCount > 0 ? 'warning' : 'default',
          hero: false,
        },
        {
          key: 'improvementTasks',
          title: '缺口数',
          value: cov.gapCount,
          suffix: '项',
          detail: cov.gapCount > 0 ? '需要补充教学支撑' : '无缺口',
          tone: cov.gapCount > 0 ? 'danger' : 'default',
          hero: false,
        },
      ]);
    })();
    return () => { cancelled = true; };
  }, []);

  if (!metrics) {
    return (
      <div className="metrics-grid">
        <div
          style={{
            color: 'rgba(255, 255, 255, 0.65)',
            padding: '24px 0',
            width: '100%',
          }}
        >
          正在从后端加载实时指标…
        </div>
      </div>
    );
  }

  const heroItem = metrics.find((m) => m.hero);
  const smallItems = metrics.filter((m) => !m.hero);

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
