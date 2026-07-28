export type RecognitionCandidateType =
  | '关系候选'
  | '映射候选'
  | '节点候选';

export type RecognitionCandidateRisk =
  | 'highImpact'
  | 'lowConfidence'
  | 'conflict'
  | 'normal';

export type CandidateReviewDecision =
  | 'accept'
  | 'modify'
  | 'merge'
  | 'split'
  | 'reject';

export interface CandidateEvidence {
  coordinate: string;
  excerpt: string;
  hash: string;
  id: string;
  resourceName: string;
  resourceVersion: string;
}

export interface CandidateImpact {
  abilityNodes: number;
  courseObjectives: number;
  rubricItems: number;
}

export interface RecognitionCandidate {
  candidateType: RecognitionCandidateType;
  confidence: number;
  conflictMessage?: string;
  course: string;
  evidence: CandidateEvidence[];
  existingFormalValue?: {
    relation: string;
    sourceNode: string;
    targetNode: string;
    version: string;
  };
  explanation: string;
  generatedAt: string;
  id: string;
  impact: CandidateImpact;
  processorVersion: string;
  relation: string;
  risk: RecognitionCandidateRisk;
  sourceNode: string;
  targetNode: string;
  title: string;
}
