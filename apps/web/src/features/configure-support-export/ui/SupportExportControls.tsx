import { WarningOutlined } from '@ant-design/icons';
import { Alert, Button, Input, Radio, Typography } from 'antd';

import type {
  SupportExportFormat,
  SupportPackage,
} from '../../../entities/support-package';
import { useSupportExportWorkflow } from '../model/useSupportExportWorkflow';

import './supportExportControls.css';

interface SupportExportControlsProps {
  blockedCount: number;
  canExport: boolean;
  canSubmitForReview: boolean;
  requiresNewVersion: boolean;
  supportPackage: SupportPackage;
}

export function SupportExportControls({
  blockedCount,
  canExport,
  canSubmitForReview,
  requiresNewVersion,
  supportPackage,
}: SupportExportControlsProps) {
  const { draft, setFormat, setPurpose, submit } =
    useSupportExportWorkflow({
      canExport,
      canSubmitForReview,
      supportPackage,
    });
  const actionLabel = canExport ? '导出支撑包' : '提交复核';

  return (
    <section className="support-export-controls">
      <Typography.Text strong>导出配置</Typography.Text>
      <Radio.Group
        onChange={(event) =>
          setFormat(event.target.value as SupportExportFormat)
        }
        options={[
          { label: 'PDF', value: 'pdf' },
          { label: 'DOCX', value: 'docx' },
          { label: '证据压缩包', value: 'evidence-archive' },
        ]}
        value={draft.format}
      />
      <Input.TextArea
        maxLength={200}
        onChange={(event) => setPurpose(event.target.value)}
        placeholder="填写导出用途（必填）"
        rows={2}
        showCount
        value={draft.purpose}
      />
      <div className="support-export-action">
        <Button
          block
          disabled={
            !draft.purpose.trim() ||
            (!canSubmitForReview && !canExport)
          }
          onClick={submit}
          type={
            (canSubmitForReview || canExport) && draft.purpose.trim()
              ? 'primary'
              : 'default'
          }
        >
          {actionLabel}
        </Button>
        <Typography.Text type="secondary">
          {draft.purpose.trim()
            ? '配置已自动保存'
            : '请填写导出用途'}
        </Typography.Text>
      </div>
      <Alert
        icon={<WarningOutlined />}
        showIcon
        title={
          requiresNewVersion
            ? '批准后内容已变化，必须创建新的支撑包版本。'
            : blockedCount > 0
              ? `存在 ${blockedCount} 个阻断项，不能提交复核或导出。`
              : supportPackage.status === 'ready-for-review'
                ? '校验通过，等待专业负责人批准。'
                : '已批准支撑包可在本机生成可打印报告或交接清单。'
        }
        type={blockedCount > 0 || requiresNewVersion ? 'warning' : 'info'}
      />
    </section>
  );
}
