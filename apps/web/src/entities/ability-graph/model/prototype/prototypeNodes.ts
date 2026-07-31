import type { AbilityGraphNode } from '../abilityGraph';
import { prototypeOutcomeNodes } from './prototypeOutcomeNodes';
import { prototypeTeachingNodes } from './prototypeTeachingNodes';

export const currentPrototypeNodes: AbilityGraphNode[] = [
  ...prototypeOutcomeNodes,
  ...prototypeTeachingNodes,
];

