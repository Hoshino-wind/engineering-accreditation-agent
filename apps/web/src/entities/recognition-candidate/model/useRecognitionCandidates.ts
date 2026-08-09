/**
 * useRecognitionCandidates — 从后端识别库加载真实候选数据的 Hook。
 *
 * 供 ③ 关系审核页共享：页头提示、汇总卡片与审核工作台使用同一份真实数据，
 * 审核写入后通过 updateCandidate 同步更新所有展示位置。
 */

import { useCallback, useEffect, useState } from 'react';

import { fetchCandidates } from '../../../shared/api/recognitionClient';
import type { RecognitionCandidate } from './recognitionCandidate';
import { mapRecognitionCandidate } from './recognitionCandidateMapper';

export function useRecognitionCandidates() {
  const [candidates, setCandidates] = useState<RecognitionCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const data = await fetchCandidates();
    setLoadFailed(data === null);
    setCandidates(data ? data.map(mapRecognitionCandidate) : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const updateCandidate = useCallback((updated: RecognitionCandidate) => {
    setCandidates((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item)),
    );
  }, []);

  return { candidates, loadFailed, loading, reload, updateCandidate };
}
