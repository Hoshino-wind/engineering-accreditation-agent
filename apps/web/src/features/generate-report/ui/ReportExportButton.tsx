import { DownloadOutlined } from '@ant-design/icons';
import { Button, message } from 'antd';

import type { ReportSection } from '../model/generateReport';

interface ReportExportButtonProps {
  sections: ReportSection[];
  disabled?: boolean;
}

// Demo 阶段：导出为 JSON 文件下载
export function ReportExportButton({ sections, disabled }: ReportExportButtonProps) {
  const handleExport = () => {
    const reportData = {
      title: '工程教育认证自评报告',
      standardVersion: '2024',
      generatedAt: new Date().toISOString(),
      sections: sections.map((s) => ({
        chapter: s.chapter,
        title: s.title,
        standardRef: s.standardRef,
        schoolStatus: s.schoolStatus,
        dataEvidence: s.dataEvidence,
        attainment: s.attainment,
        attainmentLabel: s.attainmentLabel,
      })),
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '自评报告_工程教育认证_2024.json';
    link.click();
    URL.revokeObjectURL(url);
    message.success('报告已导出');
  };

  return (
    <Button
      disabled={disabled}
      icon={<DownloadOutlined />}
      onClick={handleExport}
      type="primary"
    >
      导出自评报告
    </Button>
  );
}
