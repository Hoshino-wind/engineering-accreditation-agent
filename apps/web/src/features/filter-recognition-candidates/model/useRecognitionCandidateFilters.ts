import { useMemo, useState } from 'react';

import type {
  RecognitionCandidate,
  RecognitionCandidateRisk,
  RecognitionCandidateType,
} from '../../../entities/recognition-candidate';
import { filterRecognitionCandidates } from './filterRecognitionCandidates';

export function useRecognitionCandidateFilters(
  source: RecognitionCandidate[],
  globalCourseName?: string | null,
) {
  const [candidateType, setCandidateType] = useState<
    RecognitionCandidateType | 'all'
  >('all');
  const [course, setCourse] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [risk, setRisk] = useState<RecognitionCandidateRisk | 'all'>('all');
  const [reviewStatus, setReviewStatus] = useState<'pending' | 'all'>('pending');

  const isCourseLocked =
    globalCourseName !== undefined && globalCourseName !== null;
  const effectiveCourse = isCourseLocked ? globalCourseName : course;

  const candidates = useMemo(
    () =>
      filterRecognitionCandidates(source, {
        candidateType,
        course: effectiveCourse,
        keyword,
        risk,
        reviewStatus,
      }),
    [candidateType, effectiveCourse, keyword, risk, reviewStatus, source],
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
    isCourseLocked,
    keyword,
    risk,
    reviewStatus,
    setCandidateType,
    setCourse,
    setKeyword,
    setRisk,
    setReviewStatus,
  };
}
