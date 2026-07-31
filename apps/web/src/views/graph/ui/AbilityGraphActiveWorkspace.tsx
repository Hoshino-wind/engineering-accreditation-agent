import type { useAbilityGraphPageController } from '../model/useAbilityGraphPageController';
import { AlignmentWorkspace } from './AlignmentWorkspace';
import { CapabilityStructureWorkspace } from './CapabilityStructureWorkspace';
import { CoverageWorkspace } from './CoverageWorkspace';
import { VersionImpactWorkspace } from './VersionImpactWorkspace';
import { EvaluationStructureWorkspace } from '../../../widgets/ability-graph-evaluation';

interface AbilityGraphActiveWorkspaceProps {
  controller: ReturnType<typeof useAbilityGraphPageController>;
}

export function AbilityGraphActiveWorkspace({
  controller,
}: AbilityGraphActiveWorkspaceProps) {
  const { actions, derived, page } = controller;

  if (page.activeView === 'capability') {
    return (
      <CapabilityStructureWorkspace
        graph={page.graph}
        onInspectCourseOutcome={(courseOutcomeId) => {
          actions.selectCourseOutcome(courseOutcomeId);
          page.setActiveView('alignment');
        }}
        onInspectEvaluationStructure={(courseOutcomeId) => {
          actions.selectCourseOutcome(courseOutcomeId);
          page.setActiveView('evaluation-structure');
        }}
        onSelectCapability={page.setSelectedCapabilityId}
        selectedCapabilityId={page.selectedCapabilityId}
      />
    );
  }

  if (page.activeView === 'coverage') {
    return (
      <CoverageWorkspace
        alignments={derived.alignments}
        graph={page.graph}
        onOpenEdgeModal={actions.openEdgeModal}
        onSelectCourseOutcome={actions.selectCourseOutcome}
        onSelectOutcome={page.setSelectedOutcomeId}
        selectedAlignment={derived.selectedAlignment}
        selectedCourseOutcomeId={page.selectedCourseOutcomeId}
        selectedOutcomeId={page.selectedOutcomeId}
        selectedSupportEdge={derived.selectedSupportEdge}
        selectedSupportTarget={derived.selectedSupportTarget}
      />
    );
  }

  if (page.activeView === 'alignment') {
    return (
      <AlignmentWorkspace
        alignments={derived.alignments}
        graph={page.graph}
        onOpenEdgeModal={actions.openEdgeModal}
        onSelectCourseOutcome={actions.selectCourseOutcome}
        onSelectNode={page.setSelectedNodeId}
        onStartRevision={actions.startNodeRevision}
        onUpdateNode={actions.updateNode}
        selectedAlignment={derived.selectedAlignment}
        selectedCourseOutcomeId={page.selectedCourseOutcomeId}
        selectedNode={derived.selectedNode}
      />
    );
  }

  if (page.activeView === 'evaluation-structure') {
    return (
      <EvaluationStructureWorkspace
        alignments={derived.alignments}
        graph={page.graph}
        onNavigateToEvaluations={actions.navigateToEvaluations}
        onOpenEdgeModal={actions.openEdgeModal}
        onOpenPublish={() => page.setActiveView('publish')}
        onSelectCourseOutcome={actions.selectCourseOutcome}
        selectedAlignment={derived.selectedAlignment}
        selectedCourseOutcomeId={page.selectedCourseOutcomeId}
      />
    );
  }

  return (
    <VersionImpactWorkspace
      changes={derived.changes}
      graph={page.graph}
      impacts={derived.impacts}
      isPersisting={page.isSaving}
      onApproveChange={actions.approveChange}
      onOpenPublish={actions.openPublishModal}
      onResolveImpact={actions.resolveImpact}
      publishChecks={derived.publishChecks}
    />
  );
}
