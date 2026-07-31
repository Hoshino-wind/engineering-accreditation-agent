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
import { AttainmentSummary } from '../../../widgets/attainment-summary';
import { AttainmentWorkbench } from '../../../widgets/attainment-workbench';


const { Paragraph, Title } = Typography;

export function AttainmentEvaluationPage() {
  const { message } = App.useApp();
  const [running, setRunning] = useState(false);

  const handleRun = () => {
    setRunning(true);
    window.setTimeout(() => {
      recordWorkflowEvent({
        action: '运行达成度评价',
        actor: '当前用户',
        module: 'M6',
        objectId: 'evaluation-run-local',
        status: 'success',
        summary: '按版本化确定性策略完成 4 个就绪对象计算',
      });
      setRunning(false);
      void message.success('评价运行完成：4 个对象已更新，2 个保持阻断');
    }, 650);
  };

  return (
    <div className="attainment-evaluation-page">
      <div className="attainment-evaluation-page-header">
        <div>
          <Space align="center" size={10}>
            <Title level={2}>达成度评价与统计</Title>
            <Tag color="geekblue">确定性计算</Tag>
            <Tag>试点示例数据</Tag>
          </Space>
          <Paragraph type="secondary">
            固定图谱、策略、评分数据和样本范围，生成可复算的课程目标与能力达成结果。
          </Paragraph>
        </div>
        <Tooltip title="使用当前版本化策略计算就绪对象">
          <Button
            icon={<PlayCircleOutlined />}
            loading={running}
            onClick={handleRun}
            type="primary"
          >
            运行评价
          </Button>
        </Tooltip>
      </div>

      <Alert
        className="attainment-evaluation-notice"
        description="本次评价共 6 个评价对象，其中 4 个输入就绪、2 个被阻断；请优先处理阻断问题。正式数值仅由版本化确定性策略计算，AI 不参与数值生成。页面业务数量均为试点示例数据。"
        icon={<InfoCircleOutlined />}
        showIcon
        title="当前重点：先处理缺失输入，再确认可运行范围"
        type="warning"
      />

      <AttainmentSummary />
      <AttainmentWorkbench />
    </div>
  );
}
