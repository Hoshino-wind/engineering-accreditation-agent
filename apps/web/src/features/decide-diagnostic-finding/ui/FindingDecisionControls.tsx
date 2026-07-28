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
  Tooltip,
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

interface FindingDecisionControlsProps {
  draft: FindingDecisionDraft;
  finding: DiagnosticFinding;
  onDecisionChange: (decision: FindingDecision) => void;
  onNoteChange: (note: string) => void;
}

export function FindingDecisionControls({
  draft,
  finding,
  onDecisionChange,
  onNoteChange,
}: FindingDecisionControlsProps) {
  return (
    <section className="finding-decision-controls">
      <div className="finding-decision-heading">
        <Typography.Text strong>处置决定</Typography.Text>
        <Typography.Text type="secondary">
          当前为本地草稿
        </Typography.Text>
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
          <RollbackOutlined /> 返回 M4
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
                打开 M4 审核
              </Button>
            ) : undefined
          }
          description="处置决定只保存在当前页面，刷新后不会保留，也不会修改正式图谱。"
          showIcon
          title="处置草稿已更新"
          type="info"
        />
      ) : null}

      <Tooltip title="处置写入将在 M5 后端业务切片接入">
        <Button block disabled type="primary">
          提交处置
        </Button>
      </Tooltip>
    </section>
  );
}
