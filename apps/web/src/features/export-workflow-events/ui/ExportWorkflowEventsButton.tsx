import { CloudDownloadOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import type { ReactNode } from 'react';

import type { WorkflowEvent } from '../../../entities/workflow-event';
import { downloadWorkflowEventsCsv } from '../model/workflowEventsCsv';

interface ExportWorkflowEventsButtonProps {
  events: readonly WorkflowEvent[];
  label: ReactNode;
  onExport?: () => void;
}

export function ExportWorkflowEventsButton({
  events,
  label,
  onExport,
}: ExportWorkflowEventsButtonProps) {
  const handleExport = () => {
    downloadWorkflowEventsCsv(events);
    onExport?.();
  };

  return (
    <Button icon={<CloudDownloadOutlined />} onClick={handleExport}>
      {label}
    </Button>
  );
}
