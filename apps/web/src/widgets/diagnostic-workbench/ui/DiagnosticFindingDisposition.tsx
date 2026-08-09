import { EyeOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Descriptions,
  Empty,
  Typography,
} from 'antd';

import type {
  DiagnosticFinding,
  FindingDecision,
} from '../../../entities/diagnostic-finding';
import {
  FindingDecisionControls,
  type FindingDecisionDraft,
} from '../../../features/decide-diagnostic-finding';

interface DiagnosticFindingDispositionProps {
  draft: FindingDecisionDraft;
  finding: DiagnosticFinding | null;
  onDecisionChange: (decision: FindingDecision) => void;
  onInspectEvidence: () => void;
  onNoteChange: (note: string) => void;
  onSubmitDecision: () => void;
  submitting: boolean;
}

export function DiagnosticFindingDisposition({
  draft,
  finding,
  onDecisionChange,
  onInspectEvidence,
  onNoteChange,
  onSubmitDecision,
  submitting,
}: DiagnosticFindingDispositionProps) {
  if (!finding) {
    return (
      <Card
        className="diagnostic-finding-disposition"
        size="small"
        title="发现处置"
      >
        <Empty
          description="请选择一项诊断发现"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  return (
    <Card
      className="diagnostic-finding-disposition"
      size="small"
      title="发现处置"
    >
      <section className="diagnostic-source-version">
        <Typography.Text strong>来源与版本</Typography.Text>
        <Descriptions
          bordered
          column={1}
          items={[
            {
              key: 'graph',
              label: '图谱版本',
              children: finding.graphVersion,
            },
            {
              key: 'materials',
              label: '材料快照',
              children: finding.materialSnapshot,
            },
            {
              key: 'rules',
              label: '规则集',
              children: finding.ruleSetVersion,
            },
          ]}
          size="small"
        />
        <Button
          block
          icon={<EyeOutlined />}
          onClick={onInspectEvidence}
          size="small"
        >
          查看依据
        </Button>
      </section>

      <FindingDecisionControls
        draft={draft}
        finding={finding}
        onDecisionChange={onDecisionChange}
        onNoteChange={onNoteChange}
        onSubmitDecision={onSubmitDecision}
        submitting={submitting}
      />
    </Card>
  );
}
