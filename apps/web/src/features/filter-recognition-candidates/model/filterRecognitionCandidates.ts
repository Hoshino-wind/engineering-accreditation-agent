import type {
  RecognitionCandidate,
  RecognitionCandidateRisk,
  RecognitionCandidateType,
} from '../../../entities/recognition-candidate';

export interface RecognitionCandidateFilters {
  candidateType: RecognitionCandidateType | 'all';
  course: string;
  keyword: string;
  risk: RecognitionCandidateRisk | 'all';
  reviewStatus: 'pending' | 'all';
}

export function filterRecognitionCandidates(
  candidates: RecognitionCandidate[],
  filters: RecognitionCandidateFilters,
): RecognitionCandidate[] {
  const keyword = filters.keyword.trim().toLocaleLowerCase('zh-CN');

  return candidates.filter((candidate) => {
    const matchesKeyword =
      keyword.length === 0 ||
      [
        candidate.course,
        candidate.sourceNode,
        candidate.targetNode,
        candidate.title,
      ].some((value) =>
        value.toLocaleLowerCase('zh-CN').includes(keyword),
      );
    const matchesCourse =
      filters.course === 'all' || candidate.course === filters.course;
    const matchesType =
      filters.candidateType === 'all' ||
      candidate.candidateType === filters.candidateType;
    const matchesRisk =
      filters.risk === 'all' || candidate.risk === filters.risk;
    const matchesReviewStatus =
      filters.reviewStatus === 'all' ||
      (candidate.reviewStatus ?? 'pending') === 'pending';

    return (
      matchesKeyword &&
      matchesCourse &&
      matchesType &&
      matchesRisk &&
      matchesReviewStatus
    );
  });
}
