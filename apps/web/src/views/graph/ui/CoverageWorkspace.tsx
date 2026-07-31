import type {
  AbilityGraphEdge,
  AbilityGraphNode,
  AbilityGraphState,
  CourseOutcomeAlignment,
} from '../../../entities/ability-graph';
import { CoverageAlignmentTable } from './CoverageAlignmentTable';
import { OutcomeHierarchy } from './OutcomeHierarchy';
import { SupportRelationInspector } from './SupportRelationInspector';

interface CoverageWorkspaceProps {
  alignments: CourseOutcomeAlignment[];
  graph: AbilityGraphState;
  onOpenEdgeModal: () => void;
  onSelectCourseOutcome: (nodeId: string) => void;
  onSelectOutcome: (nodeId: string) => void;
  selectedAlignment?: CourseOutcomeAlignment;
  selectedCourseOutcomeId: string;
  selectedOutcomeId: string;
  selectedSupportEdge?: AbilityGraphEdge;
  selectedSupportTarget?: AbilityGraphNode;
}

export function CoverageWorkspace({
  alignments,
  graph,
  onOpenEdgeModal,
  onSelectCourseOutcome,
  onSelectOutcome,
  selectedAlignment,
  selectedCourseOutcomeId,
  selectedOutcomeId,
  selectedSupportEdge,
  selectedSupportTarget,
}: CoverageWorkspaceProps) {
  return (
    <section className="ability-graph-workbench">
      <OutcomeHierarchy
        graph={graph}
        onSelect={onSelectOutcome}
        selectedId={selectedOutcomeId}
      />
      <CoverageAlignmentTable
        alignments={alignments}
        graph={graph}
        onOpenEdgeModal={onOpenEdgeModal}
        onSelectCourseOutcome={onSelectCourseOutcome}
        selectedCourseOutcomeId={selectedCourseOutcomeId}
        selectedSupportTarget={selectedSupportTarget}
      />
      <SupportRelationInspector
        selectedAlignment={selectedAlignment}
        selectedSupportEdge={selectedSupportEdge}
        selectedSupportTarget={selectedSupportTarget}
      />
    </section>
  );
}
