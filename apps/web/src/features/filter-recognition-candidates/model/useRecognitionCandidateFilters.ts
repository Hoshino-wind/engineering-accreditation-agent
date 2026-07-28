import { useMemo, useState } from 'react';

import type {
  RecognitionCandidate,
  RecognitionCandidateRisk,
  RecognitionCandidateType,
} from '../../../entities/recognition-candidate';
import { filterRecognitionCandidates } from './filterRecognitionCandidates';

export function useRecognitionCandidateFilters(
  source: RecognitionCandidate[],
) {
  const [candidateType, setCandidateType] = useState<
    RecognitionCandidateType | 'all'
  >('all');
  const [course, setCourse] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [risk, setRisk] = useState<RecognitionCandidateRisk | 'all'>('all');

  const candidates = useMemo(
    () =>
      filterRecognitionCandidates(source, {
        candidateType,
        course,
        keyword,
        risk,
      }),
    [candidateType, course, keyword, risk, source],
  );

  const courses = useMemo(
    () => Array.from(new Set(source.map((candidate) => candidate.course))),
    [source],
  );

  return {
    candidateType,
    candidates,
    course,
    courses,
    keyword,
    risk,
    setCandidateType,
    setCourse,
    setKeyword,
    setRisk,
  };
}
