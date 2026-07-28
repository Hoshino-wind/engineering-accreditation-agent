import { Card, Progress, Space, Typography } from 'antd';

import { prototypeOnlyGraphQuality } from '../model/prototypeOnlyGraphQuality';
import './graphQuality.css';

function getProgressColor(percent: number, target: number) {
  if (percent >= target) {
    return '#389e0d';
  }

  if (target - percent <= 10) {
    return '#1677ff';
  }

  return '#d89614';
}

export function GraphQuality() {
  return (
    <Card
      className="graph-quality"
      extra={
        <Typography.Text type="secondary">
          发布门槛
        </Typography.Text>
      }
      size="small"
      title="图谱质量"
    >
      <Space orientation="vertical" size={14}>
        {prototypeOnlyGraphQuality.map((metric) => (
          <div className="graph-quality-item" key={metric.key}>
            <div className="graph-quality-header">
              <Typography.Text strong>{metric.label}</Typography.Text>
              <Typography.Text>
                {metric.percent}% / 目标 {metric.target}%
              </Typography.Text>
            </div>
            <Progress
              percent={metric.percent}
              showInfo={false}
              size="small"
              strokeColor={getProgressColor(metric.percent, metric.target)}
              strokeLinecap="butt"
            />
            <Typography.Text type="secondary">
              {metric.description}
            </Typography.Text>
          </div>
        ))}
      </Space>
    </Card>
  );
}
