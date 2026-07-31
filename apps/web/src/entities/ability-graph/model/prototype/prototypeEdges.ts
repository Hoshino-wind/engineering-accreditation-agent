import type { AbilityGraphEdge } from '../abilityGraph';
import { prototypeAssessmentEdges } from './prototypeAssessmentEdges';
import { prototypeOutcomeEdges } from './prototypeOutcomeEdges';
import { prototypeTeachingEdges } from './prototypeTeachingEdges';

export const currentPrototypeEdges: AbilityGraphEdge[] = [
  ...prototypeOutcomeEdges,
  ...prototypeTeachingEdges,
  ...prototypeAssessmentEdges,
];

