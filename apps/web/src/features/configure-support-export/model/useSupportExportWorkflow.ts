import { App } from 'antd';

import type {
  SupportExportFormat,
  SupportPackage,
} from '../../../entities/support-package';
import { recordWorkflowEvent } from '../../../entities/workflow-event';
import { deliverPrototypeOnlySupportPackageExport } from './prototypeOnlySupportExportDelivery';
import { useSupportExportDrafts } from './useSupportExportDrafts';

interface UseSupportExportWorkflowOptions {
  canExport: boolean;
  canSubmitForReview: boolean;
  supportPackage: SupportPackage;
}

export function useSupportExportWorkflow({
  canExport,
  canSubmitForReview,
  supportPackage,
}: UseSupportExportWorkflowOptions) {
  const { message } = App.useApp();
  const exportDrafts = useSupportExportDrafts();
  const draft = exportDrafts.getDraft(supportPackage.id);

  const submit = () => {
    const purpose = draft.purpose.trim();

    if (!purpose) {
      return;
    }

    if (canSubmitForReview) {
      recordWorkflowEvent({
        action: '提交支撑包复核',
        actor: '当前用户',
        module: 'M8',
        objectId: supportPackage.id,
        status: 'pending',
        summary: `${supportPackage.title} ${supportPackage.version}`,
      });
      void message.success('支撑包已提交复核，并写入审计轨迹');
      return;
    }

    if (!canExport) {
      return;
    }

    const deliveryResult = deliverPrototypeOnlySupportPackageExport({
      format: draft.format,
      purpose,
      supportPackage,
    });

    if (deliveryResult === 'popup-blocked') {
      void message.error('浏览器阻止了打印窗口，请允许弹窗后重试');
      return;
    }

    recordWorkflowEvent({
      action: '受控导出支撑包',
      actor: '当前用户',
      module: 'M8',
      objectId: supportPackage.id,
      status: 'success',
      summary: `${supportPackage.title} · ${draft.format} · ${purpose}`,
    });
    void message.success('导出内容已生成，并写入审计轨迹');
  };

  return {
    draft,
    setFormat: (format: SupportExportFormat) =>
      exportDrafts.setFormat(supportPackage.id, format),
    setPurpose: (purpose: string) =>
      exportDrafts.setPurpose(supportPackage.id, purpose),
    submit,
  };
}
