import { Tag } from 'antd';

import type { RecognitionCandidateRisk } from '../model/recognitionCandidate';

const riskPresentation: Record<
  RecognitionCandidateRisk,
  { color?: string; label: string }
> = {
  highImpact: { color: 'error', label: '高影响' },
  lowConfidence: { color: 'warning', label: '低置信度' },
  conflict: { color: 'error', label: '冲突' },
  normal: { label: '常规' },
};

interface RecognitionCandidateRiskTagProps {
  risk: RecognitionCandidateRisk;
}

export function RecognitionCandidateRiskTag({
  risk,
}: RecognitionCandidateRiskTagProps) {
  const presentation = riskPresentation[risk];

  return <Tag color={presentation.color}>{presentation.label}</Tag>;
}
