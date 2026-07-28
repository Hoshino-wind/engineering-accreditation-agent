import type { AttainmentEvaluationItem } from './attainmentEvaluation';
import { prototypeOnlyBlockedEvaluations } from './prototypeOnlyBlockedEvaluations';
import { prototypeOnlyReadyEvaluations } from './prototypeOnlyReadyEvaluations';

export const prototypeOnlyAttainmentEvaluations: AttainmentEvaluationItem[] = [
  prototypeOnlyReadyEvaluations[0]!,
  prototypeOnlyReadyEvaluations[1]!,
  prototypeOnlyReadyEvaluations[2]!,
  prototypeOnlyBlockedEvaluations[0]!,
  prototypeOnlyBlockedEvaluations[1]!,
  prototypeOnlyReadyEvaluations[3]!,
];
