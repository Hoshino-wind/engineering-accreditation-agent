import type { useAbilityGraphPageController } from '../model/useAbilityGraphPageController';
import {
  CreateGraphEdgeModal,
  CreateGraphNodeModal,
} from '../../../features/edit-ability-graph';
import { PublishGraphModal } from '../../../features/govern-ability-graph-version';

interface AbilityGraphPageDialogsProps {
  controller: ReturnType<typeof useAbilityGraphPageController>;
}

export function AbilityGraphPageDialogs({
  controller,
}: AbilityGraphPageDialogsProps) {
  const { actions, derived, dialogs, materials, page } = controller;

  return (
    <>
      <CreateGraphNodeModal
        isMaterialLoading={materials.isLoading}
        isSubmitting={page.isSaving}
        materialReferences={materials.references}
        onCancel={() => dialogs.setNodeModalOpen(false)}
        onNavigateToResources={() => {
          dialogs.setNodeModalOpen(false);
          actions.navigateToResources();
        }}
        onSubmit={actions.createNode}
        open={dialogs.nodeModalOpen}
      />
      <CreateGraphEdgeModal
        graph={page.graph}
        isMaterialLoading={materials.isLoading}
        isSubmitting={page.isSaving}
        materialReferences={materials.references}
        onCancel={() => dialogs.setEdgeModalOpen(false)}
        onNavigateToResources={() => {
          dialogs.setEdgeModalOpen(false);
          actions.navigateToResources();
        }}
        onSubmit={actions.createEdge}
        open={dialogs.edgeModalOpen}
      />
      <PublishGraphModal
        graph={page.graph}
        hardBlockingChecks={derived.hardBlockingChecks}
        isSubmitting={page.isSaving}
        onCancel={() => dialogs.setPublishModalOpen(false)}
        onSubmit={actions.publish}
        open={dialogs.publishModalOpen}
        publishChecks={derived.publishChecks}
      />
    </>
  );
}
