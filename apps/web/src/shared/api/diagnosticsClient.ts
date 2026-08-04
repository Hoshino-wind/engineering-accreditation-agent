import { requestJson } from './http';

export type DiagnosticRisk = 'high' | 'medium' | 'low';
export type DiagnosticDecisionStatus =
  | 'pending'
  | 'confirmed'
  | 'dismissed'
  | 'converted';

export interface DiagnosticEvidenceRefResponse {
  id: string;
  objectName: string;
  objectVersion: string;
  coordinate: string;
  excerpt: string;
  hash: string;
}

export interface DiagnosticFindingResponse {
  id: string;
  title: string;
  course: string;
  type: 'coverage-gap' | 'material-conflict' | 'structural-risk' | 'version-impact';
  risk: DiagnosticRisk;
  sourceNode: string;
  targetNode: string;
  relationLabel: string;
  graphVersion: string;
  rule: {
    id: string;
    version: string;
    kind: string;
    basis: string;
    rationale: string;
    runAt: string;
  };
  decisionStatus: DiagnosticDecisionStatus;
  impact: {
    courseObjectives: number;
    abilityNodes: number;
    evaluationInputs: number;
  };
  suggestedDestination: string;
  evidence: DiagnosticEvidenceRefResponse[];
}

export interface GraphDiagnosticReportResponse {
  graphVersion: string;
  generatedAt: string;
  overallCoverageRate: number;
  gapCount: number;
  partialCount: number;
  orphanNodeCount: number;
  diagnosticsMode: string;
  findings: DiagnosticFindingResponse[];
}

export async function fetchGraphDiagnosticReport(): Promise<GraphDiagnosticReportResponse> {
  return requestJson<GraphDiagnosticReportResponse>('/api/v1/diagnostics/graph');
}

export async function decideDiagnosticFinding(
  findingId: string,
  decision: 'confirm' | 'dismiss' | 'convert',
): Promise<DiagnosticFindingResponse> {
  return requestJson<DiagnosticFindingResponse>(
    `/api/v1/diagnostics/findings/${findingId}/decision`,
    {
      body: JSON.stringify({ decision }),
      method: 'POST',
    },
  );
}
