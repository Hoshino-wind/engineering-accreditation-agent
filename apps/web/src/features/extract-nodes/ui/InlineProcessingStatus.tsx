// 行内处理进度组件：在材料表格行内展示实时处理进度
import { CheckCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { Progress } from 'antd';

import type { PipelineStage } from '../../../shared/api/pipelineClient';
import { useResourceProcessingStatus } from '../model/useResourceProcessingStatus';

import './InlineProcessingStatus.css';

// 各阶段对应的展示文案
const STAGE_TEXT: Record<PipelineStage, string> = {
  idle: '等待处理...',
  uploading: '上传中...',
  extracting: '正在提取...',
  reviewing: '正在审核...',
  diagnosing: '正在诊断...',
  done: '已就绪',
};

interface InlineProcessingStatusProps {
  materialId: string;
}

// 行内处理进度：处理中显示进度条 + 旋转图标，完成显示绿色对勾
export function InlineProcessingStatus({
  materialId,
}: InlineProcessingStatusProps) {
  const { stage, progress, isProcessing } =
    useResourceProcessingStatus(materialId);

  // 完成态：绿色对勾 + "已就绪"
  if (stage === 'done') {
    return (
      <span className="inline-processing-status inline-processing-status-done">
        <CheckCircleOutlined className="inline-processing-status-icon" />
        <span className="inline-processing-status-text">已就绪</span>
      </span>
    );
  }

  // 处理中/等待态：旋转图标 + 文案 + 进度条
  const percent = Math.round(progress * 100);
  const baseText = STAGE_TEXT[stage] ?? '处理中...';
  const text = percent > 0 ? `${baseText} ${percent}%` : baseText;

  return (
    <div className="inline-processing-status">
      <div className="inline-processing-status-head">
        <LoadingOutlined className="inline-processing-status-icon" />
        <span className="inline-processing-status-text">{text}</span>
      </div>
      <Progress
        className="inline-processing-status-progress"
        percent={percent}
        showInfo={false}
        size="small"
        status={isProcessing ? 'active' : 'normal'}
      />
    </div>
  );
}
