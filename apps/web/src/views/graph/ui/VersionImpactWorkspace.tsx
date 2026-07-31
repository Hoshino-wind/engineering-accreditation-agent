import { useState } from 'react';

import {
  canPublishAbilityGraph,
  isAbilityGraphChangeReviewed,
  isAbilityGraphImpactResolved,
  type AbilityGraphChange,
  type AbilityGraphImpact,
  type AbilityGraphImpactAction,
  type AbilityGraphPublishCheck,
  type AbilityGraphState,
} from '../../../entities/ability-graph';
import { ChangeDetailPanel } from './version-impact/ChangeDetailPanel';
import { ChangeSetPanel } from './version-impact/ChangeSetPanel';
import { VersionImpactSide } from './version-impact/VersionImpactSide';

interface VersionImpactWorkspaceProps {
  changes: AbilityGraphChange[];
  graph: AbilityGraphState;
  impacts: AbilityGraphImpact[];
  isPersisting: boolean;
  onApproveChange: (changeId: string) => void;
  onOpenPublish: () => void;
  onResolveImpact: (
    referenceId: string,
    action: AbilityGraphImpactAction,
  ) => void;
  publishChecks: AbilityGraphPublishCheck[];
}

export function VersionImpactWorkspace({
  changes,
  graph,
  impacts,
  isPersisting,
  onApproveChange,
  onOpenPublish,
  onResolveImpact,
  publishChecks,
}: VersionImpactWorkspaceProps) {
  const [selectedChangeId, setSelectedChangeId] = useState(
    changes[0]?.id ?? '',
  );
  const selectedChange =
    changes.find((change) => change.id === selectedChangeId) ?? changes[0];
  const reviewedCount = changes.filter((change) =>
    isAbilityGraphChangeReviewed(graph, change.id),
  ).length;
  const resolvedImpactCount = impacts.filter((impact) =>
    isAbilityGraphImpactResolved(graph, impact.referenceId),
  ).length;
  const publishReady = canPublishAbilityGraph(publishChecks);
  const isPublished = graph.version.status === 'published';

  return (
    <section className="graph-version-workbench">
      <ChangeSetPanel
        changes={changes}
        graph={graph}
        isPublished={isPublished}
        onSelectChange={setSelectedChangeId}
        reviewedCount={reviewedCount}
        selectedChange={selectedChange}
      />
      <ChangeDetailPanel
        graph={graph}
        isPersisting={isPersisting}
        isPublished={isPublished}
        onApproveChange={onApproveChange}
        selectedChange={selectedChange}
      />
      <VersionImpactSide
        graph={graph}
        impacts={impacts}
        isPersisting={isPersisting}
        isPublished={isPublished}
        onOpenPublish={onOpenPublish}
        onResolveImpact={onResolveImpact}
        publishChecks={publishChecks}
        publishReady={publishReady}
        resolvedImpactCount={resolvedImpactCount}
      />
    </section>
  );
}
