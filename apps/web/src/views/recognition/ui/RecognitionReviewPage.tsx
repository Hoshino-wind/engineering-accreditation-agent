import {
  InfoCircleOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { useState } from 'react';
import {
  Alert,
  App,
  Button,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';

import { recordWorkflowEvent } from '../../../entities/workflow-event';
import { RecognitionSummary } from '../../../widgets/recognition-summary';
import { RecognitionWorkbench } from '../../../widgets/recognition-workbench';


const { Paragraph, Title } = Typography;

export function RecognitionReviewPage() {
  const { message } = App.useApp();
  const [running, setRunning] = useState(false);

  const handleRun = () => {
    setRunning(true);
    window.setTimeout(() => {
      recordWorkflowEvent({
        action: '运行智能识别',
        actor: '当前用户',
        module: 'M4',
        objectId: 'recognition-run-local',
        status: 'success',
        summary: '已基于当前试点材料生成 27 条候选建议',
      });
      setRunning(false);
      void message.success('识别运行完成：已更新 27 条候选建议');
    }, 650);
  };

  return (
    <div className="recognition-review-page">
      <div className="recognition-review-page-header">
        <div>
          <Space align="center" size={10}>
            <Title level={2}>智能识别与映射审核</Title>
            <Tag color="geekblue">候选审核</Tag>
            <Tag>试点示例数据</Tag>
          </Space>
          <Paragraph type="secondary">
            在原文、候选建议与正式图谱之间完成可追溯的人工审核。
          </Paragraph>
        </div>
        <Tooltip title="基于当前试点材料运行本地识别流程">
          <Button
            icon={<PlayCircleOutlined />}
            loading={running}
            onClick={handleRun}
            type="primary"
          >
            运行识别
          </Button>
        </Tooltip>
      </div>

      <Alert
        className="recognition-review-notice"
        description="本轮识别发现 27 条待审核候选，其中 7 条为高影响关系、4 条存在冲突；请先处理风险项，再提交正式图谱。页面业务数量均为试点示例数据。"
        icon={<InfoCircleOutlined />}
        showIcon
        title="当前重点：优先处理冲突、低置信度和高影响关系"
        type="warning"
      />

      <RecognitionSummary />
      <RecognitionWorkbench />
    </div>
  );
}
