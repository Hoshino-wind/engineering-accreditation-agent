import { WarningOutlined } from '@ant-design/icons';
import { Alert, Button, Input, Radio, Typography } from 'antd';

import type {
  SupportExportFormat,
  SupportPackage,
} from '../../../entities/support-package';
import type { SupportExportDraft } from '../model/useSupportExportDrafts';

import './supportExportControls.css';

interface SupportExportControlsProps {
  blockedCount: number;
  canExport: boolean;
  canSubmitForReview: boolean;
  draft: SupportExportDraft;
  onFormatChange: (format: SupportExportFormat) => void;
  onPurposeChange: (purpose: string) => void;
  requiresNewVersion: boolean;
  supportPackage: SupportPackage;
}

export function SupportExportControls({
  blockedCount,
  canExport,
  canSubmitForReview,
  draft,
  onFormatChange,
  onPurposeChange,
  requiresNewVersion,
  supportPackage,
}: SupportExportControlsProps) {
  const actionLabel = canExport ? '导出支撑包' : '提交复核';

  return (
    <section className="support-export-controls">
      <Typography.Text strong>导出配置</Typography.Text>
      <Radio.Group
        onChange={(event) =>
          onFormatChange(event.target.value as SupportExportFormat)
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
        onChange={(event) => onPurposeChange(event.target.value)}
        placeholder="填写导出用途（必填）"
        rows={2}
        showCount
        value={draft.purpose}
      />
      <div className="support-export-action">
        <Button
          block
          disabled
          type={
            (canSubmitForReview || canExport) && draft.purpose.trim()
              ? 'primary'
              : 'default'
          }
        >
          {actionLabel}
        </Button>
        <Typography.Text type="secondary">
          当前为本地草稿
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
                : '正式复核与受控导出将在 reporting 后端切片接入。'
        }
        type={blockedCount > 0 || requiresNewVersion ? 'warning' : 'info'}
      />
    </section>
  );
}
