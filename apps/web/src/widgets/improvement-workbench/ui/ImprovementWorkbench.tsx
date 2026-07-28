import { useMemo, useState } from 'react';

import {
  prototypeOnlyImprovementCases,
  type ImprovementCase,
} from '../../../entities/improvement-case';
import { assessImprovementClosure } from '../../../features/assess-improvement-closure';
import { useImprovementEffectivenessDrafts } from '../../../features/decide-improvement-effectiveness';
import { useImprovementCaseFilters } from '../../../features/filter-improvement-cases';
import { ImprovementTraceDrawer } from '../../../features/inspect-improvement-trace';
import { ImprovementCaseQueue } from './ImprovementCaseQueue';
import { ImprovementClosurePanel } from './ImprovementClosurePanel';
import { ImprovementPlanPanel } from './ImprovementPlanPanel';

import './improvementWorkbench.css';

export function ImprovementWorkbench() {
  const filters = useImprovementCaseFilters(
    prototypeOnlyImprovementCases,
  );
  const effectivenessDrafts = useImprovementEffectivenessDrafts();
  const [selectedCaseId, setSelectedCaseId] = useState(
    prototypeOnlyImprovementCases[0]?.id,
  );
  const [traceDrawerOpen, setTraceDrawerOpen] = useState(false);
  const selectedCase =
    filters.cases.find(
      (improvementCase) => improvementCase.id === selectedCaseId,
    ) ??
    filters.cases[0] ??
    null;
  const selectedDraft = selectedCase
    ? effectivenessDrafts.getDraft(selectedCase.id)
    : { note: '' };
  const assessment = useMemo(
    () =>
      selectedCase
        ? assessImprovementClosure(
            selectedCase,
            selectedDraft.effectiveness,
          )
        : null,
    [selectedCase, selectedDraft.effectiveness],
  );

  const handleSelect = (improvementCase: ImprovementCase) => {
    setSelectedCaseId(improvementCase.id);
  };

  return (
    <>
      <section className="improvement-workbench">
        <ImprovementCaseQueue
          cases={filters.cases}
          keyword={filters.keyword}
          onKeywordChange={filters.setKeyword}
          onSelect={handleSelect}
          onSourceChange={filters.setSource}
          onStatusChange={filters.setStatus}
          selectedCaseId={selectedCase?.id}
          source={filters.source}
          status={filters.status}
        />
        <ImprovementPlanPanel
          improvementCase={selectedCase}
          onInspectTrace={() => setTraceDrawerOpen(true)}
        />
        <ImprovementClosurePanel
          assessment={assessment}
          draft={selectedDraft}
          improvementCase={selectedCase}
          onEffectivenessChange={(effectiveness) => {
            if (selectedCase) {
              effectivenessDrafts.setEffectiveness(
                selectedCase.id,
                effectiveness,
              );
            }
          }}
          onNoteChange={(note) => {
            if (selectedCase) {
              effectivenessDrafts.setNote(selectedCase.id, note);
            }
          }}
        />
      </section>
      <ImprovementTraceDrawer
        improvementCase={selectedCase}
        onClose={() => setTraceDrawerOpen(false)}
        open={traceDrawerOpen}
      />
    </>
  );
}
