import { useState } from 'react';

import type { AbilityGraphView } from './abilityGraphPageModel';

export function useAbilityGraphPageState() {
  const [activeView, setActiveView] =
    useState<AbilityGraphView>('capability');
  const [selectedOutcomeId, setSelectedOutcomeId] = useState(
    'performance-indicator-2-1',
  );
  const [selectedCapabilityId, setSelectedCapabilityId] = useState(
    'ability-problem-analysis',
  );
  const [selectedCourseOutcomeId, setSelectedCourseOutcomeId] = useState(
    'course-outcome-ds-3',
  );
  const [selectedNodeId, setSelectedNodeId] = useState(
    'course-outcome-ds-3',
  );
  const [nodeModalOpen, setNodeModalOpen] = useState(false);
  const [edgeModalOpen, setEdgeModalOpen] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const selectCourseOutcome = (nodeId: string) => {
    setSelectedCourseOutcomeId(nodeId);
    setSelectedNodeId(nodeId);
  };

  return {
    dialogs: {
      edgeModalOpen,
      nodeModalOpen,
      publishModalOpen,
      setEdgeModalOpen,
      setNodeModalOpen,
      setPublishModalOpen,
    },
    page: {
      activeView,
      selectedCapabilityId,
      selectedCourseOutcomeId,
      selectedNodeId,
      selectedOutcomeId,
      setActiveView,
      setSelectedCapabilityId,
      setSelectedNodeId,
      setSelectedOutcomeId,
    },
    selectCourseOutcome,
  };
}
