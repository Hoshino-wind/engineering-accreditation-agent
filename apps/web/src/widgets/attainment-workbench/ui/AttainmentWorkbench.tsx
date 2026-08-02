import { useEffect, useRef, useState } from 'react';
import { App } from 'antd';

import {
  type AttainmentEvaluationSummary,
  useAttainmentEvaluationRunQuery,
} from '../../../entities/attainment-evaluation';
import { useAttainmentEvaluationFilters } from '../../../features/filter-attainment-evaluations';
import { CalculationTraceDrawer } from '../../../features/inspect-calculation-trace';
import { useEvaluationReviewDrafts } from '../../../features/review-attainment-result';
import { EvaluationCalculationPanel } from './EvaluationCalculationPanel';
import { EvaluationConfigurationPanel } from './EvaluationConfigurationPanel';
import { EvaluationObjectQueue } from './EvaluationObjectQueue';
import { EvaluationRunStateCard } from './EvaluationRunStateCard';

import './attainmentWorkbench.css';

interface AttainmentWorkbenchProps {
  evaluations: AttainmentEvaluationSummary[];
  onNavigateToAbilityGraph: () => void;
  onRecoverPresentedRun: () => void;
  onSelectedEvaluationChange: (
    evaluation: AttainmentEvaluationSummary,
  ) => void;
  selectedEvaluationId?: string;
  selectedRunId?: string;
}

export function AttainmentWorkbench({
  evaluations,
  onNavigateToAbilityGraph,
  onRecoverPresentedRun,
  onSelectedEvaluationChange,
  selectedEvaluationId,
  selectedRunId,
}: AttainmentWorkbenchProps) {
  const { message } = App.useApp();
  const filters = useAttainmentEvaluationFilters(evaluations);
  const reviewDrafts = useEvaluationReviewDrafts(evaluations);
  const [traceDrawerOpen, setTraceDrawerOpen] = useState(false);
  const previousRouteSelectedEvaluationId = useRef<string | undefined>(
    undefined,
  );
  const selectedSummary = evaluations.find(
    (evaluation) => evaluation.id === selectedEvaluationId,
  );
  const runQuery = useAttainmentEvaluationRunQuery(
    selectedRunId,
    Boolean(selectedSummary),
  );
  const runMatchesSelection = Boolean(
    runQuery.data &&
      runQuery.data.runId === selectedRunId &&
      runQuery.data.id === selectedEvaluationId,
  );
  const selectedEvaluation = runMatchesSelection
    ? (runQuery.data ?? null)
    : null;
  const shouldRecoverRun =
    runQuery.isSuccess &&
    Boolean(selectedSummary) &&
    !runMatchesSelection &&
    selectedRunId !== selectedSummary?.presentedRunId;

  useEffect(() => {
    if (!shouldRecoverRun) {
      return;
    }
    void message.warning(
      '指定运行不属于当前评价对象或已不可用，已恢复该对象的展示运行',
    );
    onRecoverPresentedRun();
  }, [
    message,
    onRecoverPresentedRun,
    shouldRecoverRun,
  ]);

  useEffect(() => {
    const routeSelectionChanged =
      previousRouteSelectedEvaluationId.current !== selectedEvaluationId;
    previousRouteSelectedEvaluationId.current = selectedEvaluationId;

    if (
      !selectedEvaluationId ||
      filters.evaluations.some(
        (evaluation) => evaluation.id === selectedEvaluationId,
      )
    ) {
      return;
    }

    if (
      routeSelectionChanged &&
      evaluations.some(
        (evaluation) => evaluation.id === selectedEvaluationId,
      )
    ) {
      filters.setCourse('all');
      filters.setKeyword('');
      filters.setStatus('all');
      return;
    }

    if (filters.evaluations.length === 0) {
      filters.setCourse('all');
      filters.setKeyword('');
      filters.setStatus('all');
      return;
    }

    const nextVisibleEvaluation = filters.evaluations[0];
    if (nextVisibleEvaluation) {
      onSelectedEvaluationChange(nextVisibleEvaluation);
    }
  }, [
    evaluations,
    filters.evaluations,
    filters.setCourse,
    filters.setKeyword,
    filters.setStatus,
    onSelectedEvaluationChange,
    selectedEvaluationId,
  ]);

  const selectedDraft = selectedEvaluation
    ? reviewDrafts.getDraft(selectedEvaluation.runId)
    : { note: '' };
  const runError =
    runQuery.isError
      ? '无法读取权威评价运行，请检查服务后重试。'
      : runQuery.isSuccess && !selectedEvaluation && !shouldRecoverRun
        ? '未找到当前评价对象的展示运行。'
        : undefined;
  const runLoading = runQuery.isPending || shouldRecoverRun;

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
          onSelect={onSelectedEvaluationChange}
          onStatusChange={filters.setStatus}
          selectedEvaluationId={selectedEvaluationId}
          status={filters.status}
          totalCount={evaluations.length}
        />
        {selectedEvaluation ? (
          <EvaluationCalculationPanel
            calculation={selectedEvaluation.calculation}
            evaluation={selectedEvaluation}
            onInspectTrace={() => setTraceDrawerOpen(true)}
            presentedRunId={
              selectedSummary?.presentedRunId ??
              selectedEvaluation.runId
            }
          />
        ) : (
          <EvaluationRunStateCard
            className="evaluation-calculation-panel"
            error={runError}
            loading={runLoading}
            onRetry={() => {
              void runQuery.refetch();
            }}
            title="计算过程与结果"
          />
        )}
        {selectedEvaluation ? (
          <EvaluationConfigurationPanel
            calculation={selectedEvaluation.calculation}
            draft={selectedDraft}
            evaluation={selectedEvaluation}
            onDecisionChange={(decision) => {
              reviewDrafts.setDecision(
                selectedEvaluation.runId,
                decision,
              );
            }}
            onInspectTrace={() => setTraceDrawerOpen(true)}
            onNavigateToAbilityGraph={onNavigateToAbilityGraph}
            onNoteChange={(note) => {
              reviewDrafts.setNote(selectedEvaluation.runId, note);
            }}
            onSubmit={() => {
              void message.info(
                '复核草稿已保存在本机；正式提交将在审批用例接入后开放',
              );
            }}
          />
        ) : (
          <EvaluationRunStateCard
            className="evaluation-configuration-panel"
            error={runError}
            loading={runLoading}
            onRetry={() => {
              void runQuery.refetch();
            }}
            title="输入快照与复核"
          />
        )}
      </section>
      <CalculationTraceDrawer
        calculation={selectedEvaluation?.calculation ?? null}
        evaluation={selectedEvaluation}
        onClose={() => setTraceDrawerOpen(false)}
        open={traceDrawerOpen}
      />
    </>
  );
}
