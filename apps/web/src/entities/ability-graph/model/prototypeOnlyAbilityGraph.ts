import {
  ABILITY_GRAPH_SCHEMA_VERSION_ID,
  type AbilityGraphState,
} from './abilityGraph';
import { prototypeDownstreamReferences } from './prototype/prototypeDownstreamReferences';
import { currentPrototypeEdges } from './prototype/prototypeEdges';
import { currentPrototypeNodes } from './prototype/prototypeNodes';
import { prototypeV04PublishedSnapshot } from './prototype/prototypeV04Snapshot';

const schemaVersionId = ABILITY_GRAPH_SCHEMA_VERSION_ID;

const currentPrototypeGraph: Pick<
  AbilityGraphState,
  'edges' | 'nodes' | 'schemaVersionId' | 'version'
> = {
  schemaVersionId,
  version: {
    name: 'v0.5',
    baseVersion: 'v0.4',
    status: 'draft',
  },
  nodes: currentPrototypeNodes,
  edges: currentPrototypeEdges,
};

export const prototypeOnlyAbilityGraph: AbilityGraphState = {
  ...currentPrototypeGraph,
  publishedSnapshots: [prototypeV04PublishedSnapshot],
  downstreamReferences: prototypeDownstreamReferences,
  changeReviews: [],
  impactDecisions: [],
};
