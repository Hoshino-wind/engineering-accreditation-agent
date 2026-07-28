import { useMemo, useState } from 'react';

import {
  prototypeOnlyAttainmentEvaluations,
  type AttainmentEvaluationItem,
} from '../../../entities/attainment-evaluation';
import { calculateAttainment } from '../../../features/calculate-attainment';
import { useAttainmentEvaluationFilters } from '../../../features/filter-attainment-evaluations';
import { CalculationTraceDrawer } from '../../../features/inspect-calculation-trace';
import { useEvaluationReviewDrafts } from '../../../features/review-attainment-result';
import { EvaluationCalculationPanel } from './EvaluationCalculationPanel';
import { EvaluationConfigurationPanel } from './EvaluationConfigurationPanel';
import { EvaluationObjectQueue } from './EvaluationObjectQueue';

import './attainmentWorkbench.css';

export function AttainmentWorkbench() {
  const filters = useAttainmentEvaluationFilters(
    prototypeOnlyAttainmentEvaluations,
  );
  const reviewDrafts = useEvaluationReviewDrafts();
  const [selectedEvaluationId, setSelectedEvaluationId] = useState(
    prototypeOnlyAttainmentEvaluations[0]?.id,
  );
  const [traceDrawerOpen, setTraceDrawerOpen] = useState(false);
  const selectedEvaluation =
    filters.evaluations.find(
      (evaluation) => evaluation.id === selectedEvaluationId,
    ) ??
    filters.evaluations[0] ??
    null;
  const calculation = useMemo(
    () =>
      selectedEvaluation
        ? calculateAttainment(selectedEvaluation)
        : null,
    [selectedEvaluation],
  );
  const selectedDraft = selectedEvaluation
    ? reviewDrafts.getDraft(selectedEvaluation.id)
    : { note: '' };

  const handleSelect = (evaluation: AttainmentEvaluationItem) => {
    setSelectedEvaluationId(evaluation.id);
  };

  return (
    <>
      <section className="attainment-workbench">
        <EvaluationObjectQueue
          course={filters.course}
          courses={filters.courses}
          evaluations={filters.evaluations}
          keyword={filters.keyword}
          onCourseChange={filters.setCourse}
          onKeywordChange={filters.setKeyword}
          onSelect={handleSelect}
          onStatusChange={filters.setStatus}
          selectedEvaluationId={selectedEvaluation?.id}
          status={filters.status}
        />
        <EvaluationCalculationPanel
          calculation={calculation}
          evaluation={selectedEvaluation}
          onInspectTrace={() => setTraceDrawerOpen(true)}
        />
        <EvaluationConfigurationPanel
          calculation={calculation}
          draft={selectedDraft}
          evaluation={selectedEvaluation}
          onDecisionChange={(decision) => {
            if (selectedEvaluation) {
              reviewDrafts.setDecision(selectedEvaluation.id, decision);
            }
          }}
          onInspectTrace={() => setTraceDrawerOpen(true)}
          onNoteChange={(note) => {
            if (selectedEvaluation) {
              reviewDrafts.setNote(selectedEvaluation.id, note);
            }
          }}
        />
      </section>
      <CalculationTraceDrawer
        calculation={calculation}
        evaluation={selectedEvaluation}
        onClose={() => setTraceDrawerOpen(false)}
        open={traceDrawerOpen}
      />
    </>
  );
}
