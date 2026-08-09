import {
  CheckCircleFilled,
  CloudUploadOutlined,
  FileSearchOutlined,
  NodeIndexOutlined,
  SolutionOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { Tooltip } from 'antd';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

import {
  type PipelineStage,
  fetchPipelineStatus,
  getStageIndex,
} from '../../../shared/api/pipelineClient';

import './pipelineProgress.css';

interface StageDef {
  key: string;
  label: string;
  shortLabel: string;
  path: string;
  icon: React.ReactNode;
  stageAfter: PipelineStage; // 该步骤完成后到达的 stage
}

const STAGES: StageDef[] = [
  {
    key: 'upload',
    label: '上传材料',
    shortLabel: '上传',
    path: '/resources',
    icon: <CloudUploadOutlined />,
    stageAfter: 'extracting',
  },
  {
    key: 'extract',
    label: 'AI 提取节点',
    shortLabel: '提取',
    path: '/graph',
    icon: <NodeIndexOutlined />,
    stageAfter: 'reviewing',
  },
  {
    key: 'review',
    label: '审核关系',
    shortLabel: '审核',
    path: '/recognition',
    icon: <SolutionOutlined />,
    stageAfter: 'diagnosing',
  },
  {
    key: 'diagnose',
    label: '覆盖诊断',
    shortLabel: '诊断',
    path: '/diagnostics',
    icon: <FileSearchOutlined />,
    stageAfter: 'done',
  },
  {
    key: 'improve',
    label: '改进建议',
    shortLabel: '改进',
    path: '/improvements',
    icon: <ToolOutlined />,
    stageAfter: 'done',
  },
];

export function PipelineProgress() {
  const [stage, setStage] = useState<PipelineStage>('idle');
  const [message, setMessage] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  const loadStatus = async () => {
    const s = await fetchPipelineStatus();
    if (!s) return;
    setStage(s.stage);
    setMessage(s.message);
  };

  useEffect(() => {
    void loadStatus();
    const interval = setInterval(loadStatus, 10_000);
    return () => clearInterval(interval);
  }, []);

  const currentIdx = getStageIndex(stage);

  return (
    <div className="pipeline-progress">
      <div className="pipeline-progress-track">
        {STAGES.map((s, idx) => {
          const stepIdx = idx + 1; // 从 1 开始，因为 0 是 idle
          const isDone = currentIdx > stepIdx;
          const isCurrent = currentIdx === stepIdx;
          const isUpcoming = currentIdx < stepIdx;
          const isHere = location.pathname === s.path;

          return (
            <Tooltip key={s.key} title={isCurrent ? message : s.label}>
              <div
                className={`pipeline-step ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''} ${isUpcoming ? 'upcoming' : ''} ${isHere ? 'here' : ''}`}
                onClick={() => navigate(s.path)}
              >
                <div className="pipeline-step-icon">
                  {isDone ? <CheckCircleFilled /> : s.icon}
                </div>
                <span className="pipeline-step-label">{s.shortLabel}</span>
                {idx < STAGES.length - 1 && (
                  <div className={`pipeline-step-line ${isDone ? 'done' : ''}`} />
                )}
              </div>
            </Tooltip>
          );
        })}
      </div>
      {message && stage !== 'idle' && stage !== 'done' && (
        <div className="pipeline-progress-message">{message}</div>
      )}
    </div>
  );
}
