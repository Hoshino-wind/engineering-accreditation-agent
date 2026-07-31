import { useNavigate } from 'react-router';

import { useAbilityGraphWorkspace } from '../../../entities/ability-graph';
import {
  useAbilityGraphCrudWorkflow,
  useAbilityGraphMaterials,
} from '../../../features/edit-ability-graph';
import { useAbilityGraphVersionWorkflow } from '../../../features/govern-ability-graph-version';
import { useAbilityGraphDerivedState } from './useAbilityGraphDerivedState';
import { useAbilityGraphPageState } from './useAbilityGraphPageState';

/**
 * 页面只装配本地选择状态、实体服务状态和两个图谱工作流 feature。
 */
export function useAbilityGraphPageController() {
  const navigate = useNavigate();
  const workspace = useAbilityGraphWorkspace();
  const state = useAbilityGraphPageState();
  const materials = useAbilityGraphMaterials();
  const derived = useAbilityGraphDerivedState({
    graph: workspace.graph,
    selectedCourseOutcomeId: state.page.selectedCourseOutcomeId,
    selectedNodeId: state.page.selectedNodeId,
    selectedOutcomeId: state.page.selectedOutcomeId,
  });
  const crudWorkflow = useAbilityGraphCrudWorkflow({
    graph: workspace.graph,
    materialSourceReferenceByKey: materials.referenceByKey,
    saveGraphAsync: workspace.saveGraphAsync,
    selectCourseOutcome: state.selectCourseOutcome,
    setEdgeModalOpen: state.dialogs.setEdgeModalOpen,
    setNodeModalOpen: state.dialogs.setNodeModalOpen,
    setSelectedNodeId: state.page.setSelectedNodeId,
  });
  const versionWorkflow = useAbilityGraphVersionWorkflow({
    graph: workspace.graph,
    publishChecks: derived.publishChecks,
    publishGraph: workspace.publishGraph,
    saveGraphAsync: workspace.saveGraphAsync,
    setPublishModalOpen: state.dialogs.setPublishModalOpen,
    startRevision: workspace.startRevision,
  });

  return {
    actions: {
      ...crudWorkflow,
      ...versionWorkflow,
      navigateToEvaluations: () => void navigate('/evaluations'),
      navigateToResources: () => void navigate('/resources'),
      openEdgeModal: () => state.dialogs.setEdgeModalOpen(true),
      openNodeModal: () => state.dialogs.setNodeModalOpen(true),
      openPublishModal: () =>
        state.dialogs.setPublishModalOpen(true),
      selectCourseOutcome: state.selectCourseOutcome,
    },
    derived,
    dialogs: state.dialogs,
    materials: {
      isLoading: materials.isLoading,
      references: materials.references,
    },
    page: {
      ...state.page,
      graph: workspace.graph,
      isLoading: workspace.isLoading,
      isSaving: workspace.isSaving,
      persistenceError: workspace.error,
      revision: workspace.revision,
      updatedBy: workspace.updatedBy,
    },
  };
}
