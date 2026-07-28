import {
  CheckCircleFilled,
  ExclamationCircleFilled,
} from '@ant-design/icons';
import { Card, Empty, Typography } from 'antd';
import type { ComponentProps } from 'react';

import type { SupportPackage } from '../../../entities/support-package';
import {
  SupportExportControls,
  type SupportExportDraft,
} from '../../../features/configure-support-export';
import { SupportBlockerLink } from '../../../features/resolve-support-package-blocker';
import type { SupportPackageValidation } from '../../../features/validate-support-package';

interface SupportValidationPanelProps {
  draft: SupportExportDraft;
  onFormatChange: SupportExportControlsProps['onFormatChange'];
  onPurposeChange: (purpose: string) => void;
  supportPackage: SupportPackage | null;
  validation: SupportPackageValidation | null;
}

type SupportExportControlsProps = ComponentProps<
  typeof SupportExportControls
>;

export function SupportValidationPanel({
  draft,
  onFormatChange,
  onPurposeChange,
  supportPackage,
  validation,
}: SupportValidationPanelProps) {
  if (!supportPackage || !validation) {
    return (
      <Card
        className="support-validation-panel"
        size="small"
        title="校验报告与导出"
      >
        <Empty
          description="请选择一个支撑包"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  return (
    <Card
      className="support-validation-panel"
      size="small"
      title="校验报告与导出"
    >
      <section className="support-validation-summary">
        <div>
          <Typography.Text strong>
            {validation.checks.length}
          </Typography.Text>
          <Typography.Text type="secondary">项检查</Typography.Text>
        </div>
        <div>
          <Typography.Text className="support-summary-pass" strong>
            {validation.passedCount}
          </Typography.Text>
          <Typography.Text type="secondary">通过</Typography.Text>
        </div>
        <div>
          <Typography.Text className="support-summary-blocked" strong>
            {validation.blockedCount}
          </Typography.Text>
          <Typography.Text type="secondary">阻断</Typography.Text>
        </div>
      </section>

      <section className="support-validation-gates">
        <Typography.Text strong>导出门槛</Typography.Text>
        <div>
          {validation.checks.map((check) => (
            <div key={check.id}>
              <span>
                {check.status === 'pass' ? (
                  <CheckCircleFilled className="support-gate--pass" />
                ) : (
                  <ExclamationCircleFilled className="support-gate--blocked" />
                )}
                <Typography.Text>{check.label}</Typography.Text>
              </span>
              {check.status === 'blocked' && check.ownerModule ? (
                <SupportBlockerLink module={check.ownerModule} />
              ) : (
                <Typography.Text type="secondary">
                  {check.status === 'pass' ? '已通过' : '待处理'}
                </Typography.Text>
              )}
            </div>
          ))}
        </div>
      </section>

      <SupportExportControls
        blockedCount={validation.blockedCount}
        canExport={validation.canExport}
        canSubmitForReview={validation.canSubmitForReview}
        draft={draft}
        onFormatChange={onFormatChange}
        onPurposeChange={onPurposeChange}
        requiresNewVersion={validation.requiresNewVersion}
        supportPackage={supportPackage}
      />
    </Card>
  );
}
