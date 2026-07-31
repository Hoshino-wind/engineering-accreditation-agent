import { WarningOutlined } from '@ant-design/icons';
import { Alert, Button, Input, Radio, Typography } from 'antd';

import type {
  ImprovementCase,
  ImprovementEffectiveness,
} from '../../../entities/improvement-case';
import type { ImprovementEffectivenessDraft } from '../model/useImprovementEffectivenessDrafts';

import './improvementEffectivenessControls.css';

interface ImprovementEffectivenessControlsProps {
  canRequestClosure: boolean;
  draft: ImprovementEffectivenessDraft;
  improvementCase: ImprovementCase;
  onEffectivenessChange: (
    effectiveness: ImprovementEffectiveness,
  ) => void;
  onNoteChange: (note: string) => void;
  onSubmit: () => void;
  requiresRevisedAction: boolean;
}

export function ImprovementEffectivenessControls({
  canRequestClosure,
  draft,
  improvementCase,
  onEffectivenessChange,
  onNoteChange,
  onSubmit,
  requiresRevisedAction,
}: ImprovementEffectivenessControlsProps) {
  const readOnly = improvementCase.status === 'closed';
  const selectedEffectiveness =
    draft.effectiveness ?? improvementCase.existingEffectiveness;

  return (
    <section className="improvement-effectiveness-controls">
      <Typography.Text strong>有效性判断</Typography.Text>
      <Radio.Group
        disabled={readOnly}
        onChange={(event) =>
          onEffectivenessChange(
            event.target.value as ImprovementEffectiveness,
          )
        }
        options={[
          { label: '有效', value: 'effective' },
          { label: '部分有效', value: 'partially-effective' },
          { label: '无效', value: 'ineffective' },
        ]}
        value={selectedEffectiveness}
      />
      <Input.TextArea
        disabled={readOnly}
        maxLength={500}
        onChange={(event) => onNoteChange(event.target.value)}
        placeholder="说明判断依据与后续决定"
        rows={2}
        showCount
        value={draft.note}
      />
      <div className="improvement-effectiveness-action">
        <Button
          block
          disabled={
            readOnly ||
            !selectedEffectiveness ||
            !draft.note.trim()
          }
          onClick={onSubmit}
          type={canRequestClosure ? 'primary' : 'default'}
        >
          {readOnly ? '关闭结论已归档' : '提交结论'}
        </Button>
        <Typography.Text type="secondary">
          {draft.note.trim()
            ? '草稿已自动保存'
            : '请补充判断依据后提交'}
        </Typography.Text>
      </div>
      {!readOnly && (
        <Alert
          icon={<WarningOutlined />}
          showIcon
          title={
            requiresRevisedAction
              ? '当前判断要求修订或新增措施，不能直接关闭。'
              : '当前复评未达到目标；只有判断有效且闭环引用完整后，才能申请关闭。'
          }
          type="warning"
        />
      )}
    </section>
  );
}
