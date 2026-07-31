import { WarningOutlined } from '@ant-design/icons';
import { Card, Progress, Space, Tag, Typography } from 'antd';

import {
  getPrimaryGraphPipelineStage,
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

export function GraphPipeline() {
  const primaryStage = getPrimaryGraphPipelineStage();

  return (
    <Card
      className="graph-pipeline"
      extra={<Tag color="blue">图谱版本 v0.3</Tag>}
      size="small"
      title="图谱建设与应用主线"
    >
      <div className="graph-pipeline-grid">
        {prototypeOnlyGraphPipeline.map((stage, index) => {
          const presentation = statusPresentation[stage.status];

          return (
            <section className="graph-pipeline-stage" key={stage.key}>
              <div className="graph-pipeline-stage-header">
                <Tag>第 {index + 1} 步</Tag>
                <Typography.Text type="secondary">
                  {presentation.label}
                </Typography.Text>
              </div>
              <Typography.Text className="graph-pipeline-stage-title" strong>
                {stage.title}
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
      <Space className="graph-pipeline-blocker" size={8}>
        <WarningOutlined aria-hidden />
        <Typography.Text>
          当前下一步：{primaryStage?.title ?? '检查工作状态'}。
          {primaryStage?.description ?? '暂无待处理事项'}
        </Typography.Text>
      </Space>
    </Card>
  );
}
