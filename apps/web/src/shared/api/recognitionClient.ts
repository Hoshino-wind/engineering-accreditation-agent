import type {
  CandidateReviewDecision,
  RecognitionCandidate,
  RecognitionCandidateRisk,
  RecognitionCandidateType,
} from '../../entities/recognition-candidate';
import { requestJson } from './http';

interface CandidateApiResponse {
  id: string;
  title: string;
  course: string;
  candidateType: string;
  confidence: number;
  risk: string;
  sourceNode: string;
  relation: string;
  targetNode: string;
  explanation: string;
  processorVersion: string;
  generatedAt: string;
  reviewStatus?: string;
  supportStrength?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewComment?: string | null;
  impact: {
    courseObjectives: number;
    abilityNodes: number;
    rubricItems: number;
  };
  conflictMessage?: string | null;
  evidence: Array<{
    id: string;
    resourceName: string;
    resourceVersion: string;
    coordinate: string;
    excerpt: string;
    hash: string;
  }>;
}

export async function fetchRecognitionCandidates(): Promise<RecognitionCandidate[]> {
  const rows = await requestJson<CandidateApiResponse[]>(
    '/api/v1/recognition/candidates',
  );
  return rows.map(toRecognitionCandidate);
}

export async function submitCandidateReview(
  candidateId: string,
  decision: CandidateReviewDecision,
  comment?: string,
  edits?: {
    confidence?: number;
    evidenceExcerpt?: string;
    relation?: string;
    sourceNode?: string;
    strength?: string;
    targetNode?: string;
  },
): Promise<RecognitionCandidate> {
  const normalizedDecision =
    decision === 'merge' || decision === 'split' ? 'modify' : decision;
  const row = await requestJson<CandidateApiResponse>(
    `/api/v1/recognition/candidates/${candidateId}/review`,
    {
      body: JSON.stringify({
        comment: comment?.trim() || undefined,
        decision: normalizedDecision,
        ...edits,
      }),
      method: 'POST',
    },
  );
  return toRecognitionCandidate(row);
}

function toRecognitionCandidate(row: CandidateApiResponse): RecognitionCandidate {
  return {
    id: row.id,
    title: row.title,
    course: row.course,
    candidateType: row.candidateType as RecognitionCandidateType,
    confidence: row.confidence,
    risk: row.risk as RecognitionCandidateRisk,
    sourceNode: row.sourceNode,
    relation: row.relation,
    targetNode: row.targetNode,
    explanation: row.explanation,
    processorVersion: row.processorVersion,
    generatedAt: row.generatedAt,
    reviewStatus: row.reviewStatus as RecognitionCandidate['reviewStatus'],
    supportStrength: row.supportStrength ?? undefined,
    reviewedBy: row.reviewedBy ?? undefined,
    reviewedAt: row.reviewedAt ?? undefined,
    reviewComment: row.reviewComment ?? undefined,
    impact: row.impact,
    conflictMessage: row.conflictMessage ?? undefined,
    evidence: row.evidence,
  };
}
