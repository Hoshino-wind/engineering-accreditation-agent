import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExportOutlined,
  RollbackOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Input,
  Radio,
  Space,
  Tag,
  Typography,
} from 'antd';
import type { RadioChangeEvent } from 'antd';

import type {
  DiagnosticFinding,
  FindingDecision,
} from '../../../entities/diagnostic-finding';
import type { FindingDecisionDraft } from '../model/useFindingDecisionDrafts';

import './findingDecisionControls.css';

const { TextArea } = Input;

const DECISION_STATUS_META: Record<
  string,
  { color: string; label: string } | undefined
> = {
  confirmed: { color: 'success', label: '已确认' },
  converted: { color: 'processing', label: '已转入改进' },
  dismissed: { color: 'default', label: '已忽略' },
  pending: { color: 'warning', label: '待处置' },
};

interface FindingDecisionControlsProps {
  draft: FindingDecisionDraft;
  finding: DiagnosticFinding;
  onDecisionChange: (decision: FindingDecision) => void;
  onNoteChange: (note: string) => void;
  onSubmitDecision: () => void;
  submitting: boolean;
}

export function FindingDecisionControls({
  draft,
  finding,
  onDecisionChange,
  onNoteChange,
  onSubmitDecision,
  submitting,
}: FindingDecisionControlsProps) {
  const statusMeta = finding.decisionStatus
    ? DECISION_STATUS_META[finding.decisionStatus]
    : undefined;

  return (
    <section className="finding-decision-controls">
      <div className="finding-decision-heading">
        <Typography.Text strong>处置决定</Typography.Text>
        {statusMeta ? (
          <Space>
            <Tag color={statusMeta.color}>
              诊断库状态：{statusMeta.label}
            </Tag>
          </Space>
        ) : (
          <Typography.Text type="secondary">
            当前为本地草稿
          </Typography.Text>
        )}
      </div>
      <Radio.Group
        buttonStyle="solid"
        onChange={(event: RadioChangeEvent) =>
          onDecisionChange(event.target.value as FindingDecision)
        }
        value={draft.decision}
      >
        <Radio.Button value="confirm">
          <CheckCircleOutlined /> 确认问题
        </Radio.Button>
        <Radio.Button value="convert">
          <ExportOutlined /> 转入改进
        </Radio.Button>
        <Radio.Button value="return-recognition">
          <RollbackOutlined /> 返回审核
        </Radio.Button>
        <Radio.Button value="exempt">
          <SafetyCertificateOutlined /> 豁免
        </Radio.Button>
        <Radio.Button value="dismiss">
          <CloseCircleOutlined /> 忽略
        </Radio.Button>
      </Radio.Group>

      <label htmlFor={`finding-note-${finding.id}`}>
        <Typography.Text strong>处置说明</Typography.Text>
      </label>
      <TextArea
        id={`finding-note-${finding.id}`}
        maxLength={500}
        onChange={(event) => onNoteChange(event.target.value)}
        placeholder="说明处置原因、依据或修复建议"
        rows={4}
        showCount
        value={draft.note}
      />

      {draft.decision ? (
        <Alert
          action={
            draft.decision === 'return-recognition' ? (
              <Button href="/recognition" size="small">
                打开关系审核
              </Button>
            ) : undefined
          }
          description={
            draft.decision === 'confirm' ||
            draft.decision === 'convert' ||
            draft.decision === 'dismiss'
              ? '点击下方「提交处置」后，决定将写入诊断库并实时更新该发现的处置状态。'
              : '该动作为本地流程动作，不会写入诊断库。'
          }
          showIcon
          title="处置草稿已就绪"
          type="info"
        />
      ) : null}

      <Button
        block
        disabled={!draft.decision}
        loading={submitting}
        onClick={onSubmitDecision}
        type="primary"
      >
        提交处置
      </Button>
    </section>
  );
}
