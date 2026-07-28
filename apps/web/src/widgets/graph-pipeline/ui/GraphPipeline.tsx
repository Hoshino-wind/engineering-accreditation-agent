import { WarningOutlined } from '@ant-design/icons';
import { Card, Progress, Space, Tag, Typography } from 'antd';

import {
  prototypeOnlyGraphPipeline,
  type GraphPipelineStageStatus,
} from '../model/prototypeOnlyGraphPipeline';
import './graphPipeline.css';

const statusPresentation: Record<
  GraphPipelineStageStatus,
  { color: string; label: string; progressColor: string }
> = {
  complete: {
    color: 'green',
    label: '已就绪',
    progressColor: '#389e0d',
  },
  active: {
    color: 'blue',
    label: '进行中',
    progressColor: '#1677ff',
  },
  blocked: {
    color: 'orange',
    label: '有阻断',
    progressColor: '#d89614',
  },
  pending: {
    color: 'default',
    label: '待开始',
    progressColor: '#bfbfbf',
  },
};

export function GraphPipeline() {
  return (
    <Card
      className="graph-pipeline"
      extra={<Tag color="blue">图谱版本 v0.3</Tag>}
      size="small"
      title="图谱建设与应用主线"
    >
      <div className="graph-pipeline-grid">
        {prototypeOnlyGraphPipeline.map((stage) => {
          const presentation = statusPresentation[stage.status];

          return (
            <section className="graph-pipeline-stage" key={stage.key}>
              <div className="graph-pipeline-stage-header">
                <Tag color="geekblue">{stage.code}</Tag>
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
          当前优先处理 M4 候选审核和 M5 评分项断点；问题清零后才能启动正式评价。
        </Typography.Text>
      </Space>
    </Card>
  );
}
