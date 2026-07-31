import { Tabs } from 'antd';

import './abilityGraphPage.css';

import {
  graphViewItems,
  type AbilityGraphView,
} from '../model/abilityGraphPageModel';
import { useAbilityGraphPageController } from '../model/useAbilityGraphPageController';
import { AbilityGraphActiveWorkspace } from './AbilityGraphActiveWorkspace';
import { AbilityGraphPageDialogs } from './AbilityGraphPageDialogs';
import { AbilityGraphPageHeader } from './AbilityGraphPageHeader';
import {
  AbilityGraphPersistenceNotice,
  AbilityGraphPublishNotice,
  AbilityGraphQualitySummary,
} from './AbilityGraphPageOverview';

export function AbilityGraphPage() {
  const controller = useAbilityGraphPageController();
  const { actions, derived, page } = controller;

  return (
    <div className="ability-graph-page">
      <AbilityGraphPageHeader
        activeView={page.activeView}
        graph={page.graph}
        isLoading={page.isLoading}
        isSaving={page.isSaving}
        onOpenEdgeModal={actions.openEdgeModal}
        onOpenNodeModal={actions.openNodeModal}
        onOpenPublish={() => page.setActiveView('publish')}
        onStartGraphRevision={actions.startGraphRevision}
        persistenceError={page.persistenceError}
        revision={page.revision}
        updatedBy={page.updatedBy}
      />
      <Tabs
        activeKey={page.activeView}
        className="ability-graph-task-tabs"
        items={graphViewItems}
        onChange={(key) => page.setActiveView(key as AbilityGraphView)}
      />
      <AbilityGraphPersistenceNotice error={page.persistenceError} />
      <AbilityGraphPublishNotice
        activeView={page.activeView}
        blockingChecks={derived.blockingChecks}
        graph={page.graph}
      />
      <AbilityGraphQualitySummary
        activeView={page.activeView}
        qualityMetrics={derived.qualityMetrics}
      />
      <AbilityGraphActiveWorkspace controller={controller} />
      <AbilityGraphPageDialogs controller={controller} />
    </div>
  );
}
