import { Tag } from 'antd';

import type { RecognitionCandidateRisk } from '../model/recognitionCandidate';

const riskPresentation: Record<
  RecognitionCandidateRisk,
  { color?: string; label: string }
> = {
  conflict: { color: 'red', label: '冲突' },
  highImpact: { color: 'orange', label: '高影响' },
  lowConfidence: { color: 'gold', label: '低置信度' },
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
