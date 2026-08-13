import {
  AuditOutlined,
  DashboardOutlined,
  SafetyCertificateOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { Card, Tag } from 'antd';
import { useEffect, useState, type ReactNode } from 'react';

import {
  fetchCoverage,
  fetchGraphPendingReviewCount,
} from '../../../shared/api/graphClient';

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
  key: MetricKey;
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

const toneLabel: Record<MetricItem['tone'], { text: string; cls: string }> = {
  primary: { text: '核心', cls: 'tag-primary' },
  default: { text: '观测', cls: 'tag-default' },
  warning: { text: '待处理', cls: 'tag-warning' },
  danger: { text: '关注', cls: 'tag-danger' },
};

function SmallMetricCard({ item }: { item: MetricItem }) {
  const display = item.displayValue ?? item.value;
  const suffix = item.displaySuffix ?? item.suffix;
  const tag = toneLabel[item.tone];

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
      const [cov, pendingRelationCount] = await Promise.all([
        fetchCoverage(),
        fetchGraphPendingReviewCount(),
      ]);
      if (cancelled) return;

      if (!cov) {
        setMetrics([
          {
            key: 'standardCoverage',
            title: '标准覆盖率',
            value: 0,
            suffix: '%',
            detail: '后端未连接，暂无覆盖度数据',
            tone: 'default',
          },
          {
            key: 'avgAttainment',
            title: '材料支撑指数',
            value: 0,
            suffix: '',
            displayValue: '-',
            displaySuffix: '',
            detail: '后端未连接',
            tone: 'default',
          },
          {
            key: 'pendingReview',
            title: '待审核关系',
            value: 0,
            suffix: '条',
            detail: '后端未连接',
            tone: 'default',
          },
          {
            key: 'improvementTasks',
            title: '缺口数',
            value: 0,
            suffix: '项',
            detail: '后端未连接',
            tone: 'default',
          },
        ]);
        return;
      }

      const rate = Math.round((cov.overallCoverageRate ?? 0) * 100);
      const comps = cov.competencies ?? [];
      const avgAtt = comps.length
        ? Math.round(
            (comps.reduce((sum, comp) => sum + (comp.attainment ?? 0), 0) /
              comps.length) *
              100,
          )
        : 0;
      const pendingCount =
        pendingRelationCount ??
        comps.filter((comp) => comp.hasPendingReview).length;

      setMetrics([
        {
          key: 'standardCoverage',
          title: '标准覆盖率',
          value: rate,
          suffix: '%',
          detail: `${cov.coveredCount} 项已覆盖 / ${cov.partialCount} 项部分 / ${cov.gapCount} 项缺口`,
          tone: 'primary',
        },
        {
          key: 'avgAttainment',
          title: '材料支撑指数',
          value: avgAtt / 100,
          suffix: '',
          displayValue: String(avgAtt),
          displaySuffix: '%',
          detail: `${cov.coveredCount} 项支撑充分，${cov.partialCount} 项证据不足`,
          tone: 'default',
        },
        {
          key: 'pendingReview',
          title: '待审核关系',
          value: pendingCount,
          suffix: '条',
          detail: pendingCount > 0 ? 'AI 推断关系待确认' : '全部已审核',
          tone: pendingCount > 0 ? 'warning' : 'default',
        },
        {
          key: 'improvementTasks',
          title: '缺口数',
          value: cov.gapCount,
          suffix: '项',
          detail: cov.gapCount > 0 ? '需要补充教学支撑' : '无缺口',
          tone: cov.gapCount > 0 ? 'danger' : 'default',
        },
      ]);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!metrics) {
    return (
      <div className="metrics-grid">
        <div className="metrics-loading">正在从后端加载实时指标...</div>
      </div>
    );
  }

  return (
    <div className="metrics-grid">
      {metrics.map((item) => (
        <SmallMetricCard key={item.key} item={item} />
      ))}
    </div>
  );
}
