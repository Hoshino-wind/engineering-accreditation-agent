import type {
  AbilityGraphCapabilityLevel,
  AbilityGraphNodeType,
  AbilityGraphRelationType,
  AbilityGraphSourceRef,
} from '../../../entities/ability-graph';

export interface NewNodeValues {
  capabilityDomain?: string;
  capabilityLevel?: AbilityGraphCapabilityLevel;
  code: string;
  definition: string;
  name: string;
  observableBehaviors?: string[];
  owner: string;
  sourceRefKey: string;
  type: AbilityGraphNodeType;
}

export interface NewEdgeValues {
  effectiveCycle: string;
  rationale?: string;
  relation: AbilityGraphRelationType;
  sourceId: string;
  sourceRefKey: string;
  targetBehaviors?: string[];
  targetId: string;
}

export interface MaterialSourceReference {
  key: string;
  label: string;
  source: AbilityGraphSourceRef;
}
