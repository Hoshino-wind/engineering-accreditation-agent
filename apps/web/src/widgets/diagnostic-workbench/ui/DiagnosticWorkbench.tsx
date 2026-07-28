import { useState } from 'react';

import {
  prototypeOnlyDiagnosticFindings,
  type DiagnosticFinding,
} from '../../../entities/diagnostic-finding';
import { useFindingDecisionDrafts } from '../../../features/decide-diagnostic-finding';
import { useDiagnosticFindingFilters } from '../../../features/filter-diagnostic-findings';
import { DiagnosticEvidenceDrawer } from '../../../features/inspect-diagnostic-evidence';
import { DiagnosticFindingAnalysis } from './DiagnosticFindingAnalysis';
import { DiagnosticFindingDisposition } from './DiagnosticFindingDisposition';
import { DiagnosticFindingQueue } from './DiagnosticFindingQueue';

import './diagnosticWorkbench.css';

export function DiagnosticWorkbench() {
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
