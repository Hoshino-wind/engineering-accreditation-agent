import type {
  RecognitionCandidateDTO,
  RecognitionCandidateEvidenceDTO,
} from '../../../shared/api/recognitionClient';
import type {
  RecognitionCandidate,
  RecognitionCandidateRisk,
  RecognitionCandidateType,
} from './recognitionCandidate';

/** 后端 StrEnum 值与前端字面量一致，此处做兜底归一化防脏数据。 */

const CANDIDATE_TYPES: readonly RecognitionCandidateType[] = [
  '关系候选',
  '映射候选',
  '节点候选',
];

const CANDIDATE_RISKS: readonly RecognitionCandidateRisk[] = [
  'highImpact',
  'lowConfidence',
  'conflict',
  'normal',
];

const REVIEW_STATUSES = ['accepted', 'modified', 'pending', 'rejected'] as const;

function asCandidateType(value: string): RecognitionCandidateType {
  return CANDIDATE_TYPES.includes(value as RecognitionCandidateType)
    ? (value as RecognitionCandidateType)
    : '关系候选';
}

function asCandidateRisk(value: string): RecognitionCandidateRisk {
  return CANDIDATE_RISKS.includes(value as RecognitionCandidateRisk)
    ? (value as RecognitionCandidateRisk)
    : 'normal';
}

function asReviewStatus(
  value: string | undefined,
): RecognitionCandidate['reviewStatus'] {
  return REVIEW_STATUSES.includes(value as (typeof REVIEW_STATUSES)[number])
    ? (value as NonNullable<RecognitionCandidate['reviewStatus']>)
    : 'pending';
}

export function mapCandidateEvidence(
  raw: RecognitionCandidateEvidenceDTO,
): RecognitionCandidate['evidence'][number] {
  return {
    coordinate: raw.coordinate,
    excerpt: raw.excerpt,
    hash: raw.hash,
    id: raw.id,
    resourceName: raw.resourceName,
    resourceVersion: raw.resourceVersion,
  };
}

/** 后端 DTO → 前端实体。 */
export function mapRecognitionCandidate(
  raw: RecognitionCandidateDTO,
): RecognitionCandidate {
  return {
    candidateType: asCandidateType(raw.candidateType),
    confidence: Number.isFinite(raw.confidence) ? raw.confidence : 0,
    conflictMessage: raw.conflictMessage ?? undefined,
    course: raw.course,
    evidence: (raw.evidence ?? []).map(mapCandidateEvidence),
    explanation: raw.explanation,
    generatedAt: raw.generatedAt,
    id: raw.id,
    impact: {
      abilityNodes: raw.impact?.abilityNodes ?? 0,
      courseObjectives: raw.impact?.courseObjectives ?? 0,
      rubricItems: raw.impact?.rubricItems ?? 0,
    },
    processorVersion: raw.processorVersion,
    relation: raw.relation,
    reviewStatus: asReviewStatus(raw.reviewStatus),
    risk: asCandidateRisk(raw.risk),
    sourceNode: raw.sourceNode,
    targetNode: raw.targetNode,
    title: raw.title,
  };
}
