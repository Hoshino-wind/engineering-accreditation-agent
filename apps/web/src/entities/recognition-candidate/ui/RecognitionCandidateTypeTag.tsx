import { Tag } from 'antd';

import type { RecognitionCandidateType } from '../model/recognitionCandidate';

const typeColor: Record<RecognitionCandidateType, string> = {
  关系候选: 'blue',
  映射候选: 'green',
  节点候选: 'purple',
};

interface RecognitionCandidateTypeTagProps {
  candidateType: RecognitionCandidateType;
}

export function RecognitionCandidateTypeTag({
  candidateType,
}: RecognitionCandidateTypeTagProps) {
  return <Tag color={typeColor[candidateType]}>{candidateType}</Tag>;
}
