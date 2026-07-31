import { useState } from 'react';
import { App } from 'antd';

import {
  prototypeOnlyDiagnosticFindings,
  type DiagnosticFinding,
} from '../../../entities/diagnostic-finding';
import { recordWorkflowEvent } from '../../../entities/workflow-event';
import { useFindingDecisionDrafts } from '../../../features/decide-diagnostic-finding';
import { useDiagnosticFindingFilters } from '../../../features/filter-diagnostic-findings';
import { DiagnosticEvidenceDrawer } from '../../../features/inspect-diagnostic-evidence';
import { DiagnosticFindingAnalysis } from './DiagnosticFindingAnalysis';
import { DiagnosticFindingDisposition } from './DiagnosticFindingDisposition';
import { DiagnosticFindingQueue } from './DiagnosticFindingQueue';

import './diagnosticWorkbench.css';

export function DiagnosticWorkbench() {
  const { message } = App.useApp();
  const filters = useDiagnosticFindingFilters(
    prototypeOnlyDiagnosticFindings,
  );
  const decisionDrafts = useFindingDecisionDrafts();
  const [selectedFindingId, setSelectedFindingId] = useState(
    prototypeOnlyDiagnosticFindings[0]?.id,
  );
  const [evidenceDrawerOpen, setEvidenceDrawerOpen] = useState(false);

  const selectedFinding =
    filters.findings.find(
      (finding) => finding.id === selectedFindingId,
    ) ??
    filters.findings[0] ??
    null;
  const selectedDraft = selectedFinding
    ? decisionDrafts.getDraft(selectedFinding.id)
    : { note: '' };

  const handleSelect = (finding: DiagnosticFinding) => {
    setSelectedFindingId(finding.id);
  };

  return (
    <>
      <section className="diagnostic-workbench">
        <DiagnosticFindingQueue
          course={filters.course}
          courses={filters.courses}
          findingType={filters.findingType}
          findings={filters.findings}
          keyword={filters.keyword}
          onCourseChange={filters.setCourse}
          onFindingTypeChange={filters.setFindingType}
          onKeywordChange={filters.setKeyword}
          onRiskChange={filters.setRisk}
          onSelect={handleSelect}
          risk={filters.risk}
          selectedFindingId={selectedFinding?.id}
        />
        <DiagnosticFindingAnalysis finding={selectedFinding} />
        <DiagnosticFindingDisposition
          draft={selectedDraft}
          finding={selectedFinding}
          onDecisionChange={(decision) => {
            if (selectedFinding) {
              decisionDrafts.setDecision(selectedFinding.id, decision);
            }
          }}
          onInspectEvidence={() => setEvidenceDrawerOpen(true)}
          onNoteChange={(note) => {
            if (selectedFinding) {
              decisionDrafts.setNote(selectedFinding.id, note);
            }
          }}
          onSubmit={() => {
            if (!selectedFinding || !selectedDraft.decision) {
              return;
            }
            recordWorkflowEvent({
              action: '提交诊断处置',
              actor: '当前用户',
              module: 'M5',
              objectId: selectedFinding.id,
              status:
                selectedDraft.decision === 'dismiss'
                  ? 'warning'
                  : 'success',
              summary: `${selectedFinding.title}：${selectedDraft.decision}`,
            });
            void message.success('处置结果已保存，并写入治理中心审计轨迹');
          }}
        />
      </section>
      <DiagnosticEvidenceDrawer
        finding={selectedFinding}
        onClose={() => setEvidenceDrawerOpen(false)}
        open={evidenceDrawerOpen}
      />
    </>
  );
}
