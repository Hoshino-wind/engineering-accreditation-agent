import { useEffect, useMemo, useRef, useState } from 'react';
import { App } from 'antd';

import {
  prototypeOnlyImprovementCases,
  type ImprovementCase,
} from '../../../entities/improvement-case';
import { recordWorkflowEvent } from '../../../entities/workflow-event';
import { assessImprovementClosure } from '../../../features/assess-improvement-closure';
import { useImprovementEffectivenessDrafts } from '../../../features/decide-improvement-effectiveness';
import { useImprovementCaseFilters } from '../../../features/filter-improvement-cases';
import { ImprovementTraceDrawer } from '../../../features/inspect-improvement-trace';
import { ImprovementCaseQueue } from './ImprovementCaseQueue';
import { ImprovementClosurePanel } from './ImprovementClosurePanel';
import { ImprovementPlanPanel } from './ImprovementPlanPanel';

import './improvementWorkbench.css';

interface ImprovementWorkbenchProps {
  cases?: ImprovementCase[];
  onSelectedCaseIdChange?: (caseId: string) => void;
  selectedCaseId?: string;
}

export function ImprovementWorkbench({
  cases = prototypeOnlyImprovementCases,
  onSelectedCaseIdChange,
  selectedCaseId,
}: ImprovementWorkbenchProps) {
  const { message } = App.useApp();
  const filters = useImprovementCaseFilters(cases);
  const effectivenessDrafts = useImprovementEffectivenessDrafts();
  const [localSelectedCaseId, setLocalSelectedCaseId] = useState(
    cases[0]?.id,
  );
  const [traceDrawerOpen, setTraceDrawerOpen] = useState(false);
  const previousRouteSelectedCaseId = useRef<string | undefined>(
    undefined,
  );
  const resolvedSelectedCaseId =
    selectedCaseId ?? localSelectedCaseId;
  const routeSelectedCase = selectedCaseId
    ? cases.find(
        (improvementCase) =>
          improvementCase.id === selectedCaseId,
      )
    : undefined;
  const selectedCase =
    routeSelectedCase ??
    filters.cases.find(
      (improvementCase) =>
        improvementCase.id === resolvedSelectedCaseId,
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

  useEffect(() => {
    const routeSelectionChanged =
      previousRouteSelectedCaseId.current !== selectedCaseId;
    previousRouteSelectedCaseId.current = selectedCaseId;

    if (
      !selectedCaseId ||
      !onSelectedCaseIdChange ||
      filters.cases.some(
        (improvementCase) =>
          improvementCase.id === selectedCaseId,
      )
    ) {
      return;
    }

    if (
      routeSelectionChanged &&
      cases.some(
        (improvementCase) =>
          improvementCase.id === selectedCaseId,
      )
    ) {
      filters.setKeyword('');
      filters.setSource('all');
      filters.setStatus('all');
      return;
    }

    const nextVisibleCase = filters.cases[0];
    if (nextVisibleCase) {
      onSelectedCaseIdChange(nextVisibleCase.id);
    }
  }, [
    cases,
    filters.cases,
    filters.setKeyword,
    filters.setSource,
    filters.setStatus,
    onSelectedCaseIdChange,
    selectedCaseId,
  ]);

  const handleSelect = (improvementCase: ImprovementCase) => {
    setLocalSelectedCaseId(improvementCase.id);
    onSelectedCaseIdChange?.(improvementCase.id);
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
          totalCount={cases.length}
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
          onSubmit={() => {
            const effectiveness =
              selectedDraft.effectiveness ??
              selectedCase?.existingEffectiveness;
            if (!selectedCase || !effectiveness || !selectedDraft.note.trim()) {
              return;
            }
            recordWorkflowEvent({
              action: assessment?.canRequestClosure
                ? '申请关闭改进问题'
                : '提交改进有效性结论',
              actor: '当前用户',
              module: 'M7',
              objectId: selectedCase.id,
              status: assessment?.canRequestClosure
                ? 'success'
                : 'warning',
              summary: `${selectedCase.title}：${effectiveness}`,
            });
            void message.success(
              assessment?.canRequestClosure
                ? '关闭申请已保存，并写入审计轨迹'
                : '有效性结论已保存；未满足关闭条件的项目仍保持开启',
            );
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
