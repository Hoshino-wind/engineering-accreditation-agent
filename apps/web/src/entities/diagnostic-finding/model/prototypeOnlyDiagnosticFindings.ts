import type { DiagnosticFinding } from './diagnosticFinding';
import { prototypeOnlyConsistencyFindings } from './prototypeOnlyConsistencyFindings';
import { prototypeOnlyCoverageFindings } from './prototypeOnlyCoverageFindings';
import { prototypeOnlyStructureFindings } from './prototypeOnlyStructureFindings';

export const prototypeOnlyDiagnosticFindings: DiagnosticFinding[] = [
  prototypeOnlyCoverageFindings[0],
  prototypeOnlyConsistencyFindings[0],
  prototypeOnlyStructureFindings[0],
  prototypeOnlyCoverageFindings[1],
  prototypeOnlyStructureFindings[1],
  prototypeOnlyConsistencyFindings[1],
  prototypeOnlyConsistencyFindings[2],
];
