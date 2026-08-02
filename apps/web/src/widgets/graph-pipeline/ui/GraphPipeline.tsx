import {
  ApartmentOutlined,
  BarChartOutlined,
  FileDoneOutlined,
  FileSearchOutlined,
  FolderOpenOutlined,
  RobotOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { Card, Progress, Typography } from 'antd';
import type { ReactNode } from 'react';

import {
  prototypeOnlyGraphPipeline,
  type GraphPipelineStageStatus,
} from '../model/prototypeOnlyGraphPipeline';
import './graphPipeline.css';

const statusPresentation: Record<
  GraphPipelineStageStatus,
  { label: string; progressColor: string }
> = {
  complete: {
    label: '已就绪',
    progressColor: 'var(--app-success)',
  },
  active: {
    label: '进行中',
    progressColor: 'var(--app-primary)',
  },
  blocked: {
    label: '有阻断',
    progressColor: 'var(--app-warning)',
  },
  pending: {
    label: '待开始',
    progressColor: 'var(--app-text-muted)',
  },
};

const stageIcons: Record<string, ReactNode> = {
  diagnosis: <FileSearchOutlined />,
  evaluation: <BarChartOutlined />,
  graph: <ApartmentOutlined />,
  improvement: <ToolOutlined />,
  recognition: <RobotOutlined />,
  resources: <FolderOpenOutlined />,
  support: <FileDoneOutlined />,
};

export function GraphPipeline() {
  return (
    <Card
      className="graph-pipeline"
      size="small"
    >
      <div className="graph-pipeline-grid">
        {prototypeOnlyGraphPipeline.map((stage, index) => {
          const presentation = statusPresentation[stage.status];

          return (
            <section
              className={`graph-pipeline-stage graph-pipeline-stage--${stage.status}`}
              key={stage.key}
            >
              <div className="graph-pipeline-stage-header">
                <span
                  className="graph-pipeline-step-number"
                  aria-label={`第 ${index + 1} 步`}
                >
                  {index + 1}
                </span>
              </div>
              <span aria-hidden className="graph-pipeline-stage-icon">
                {stageIcons[stage.key]}
              </span>
              <Typography.Text className="graph-pipeline-stage-title" strong>
                {stage.title}
              </Typography.Text>
              <Typography.Text className="graph-pipeline-stage-status">
                {presentation.label}
              </Typography.Text>
              <Typography.Text
                className="graph-pipeline-stage-description"
                type="secondary"
              >
                {stage.description}
              </Typography.Text>
              <Progress
                percent={stage.percent}
                showInfo={false}
                size="small"
                strokeColor={presentation.progressColor}
                strokeLinecap="butt"
              />
              <Typography.Text className="graph-pipeline-percent">
                {stage.percent}%
              </Typography.Text>
            </section>
          );
        })}
      </div>
    </Card>
  );
}
