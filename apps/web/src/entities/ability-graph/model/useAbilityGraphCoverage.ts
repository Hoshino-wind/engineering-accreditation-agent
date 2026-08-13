/**
 * useAbilityGraphCoverage — 获取后端实时覆盖度/达成度数据的 Hook。
 *
 * 数据来自 /orchestration/graph/coverage，是后端确定性计算（domain/coverage.py）
 * 的结果：只有审核状态为 approved 的关系计入，支撑强度按 strong=3 / medium=2 /
 * weak=1 加权。不是大模型输出，可复算、可审计。
 * 提供 refresh() 供审核联动：审核决定写入后重新拉取。
 */

import { useCallback, useEffect, useState } from 'react';

import {
  fetchCoverage,
  type CoverageData,
} from '../../../shared/api/graphClient';

export interface UseAbilityGraphCoverageResult {
  coverage: CoverageData | null;
  loading: boolean;
  /** 重新向后端拉取覆盖度（审核决定写入后调用） */
  refresh: () => void;
}

export function useAbilityGraphCoverage(): UseAbilityGraphCoverageResult {
  const [coverage, setCoverage] = useState<CoverageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const data = await fetchCoverage();
      if (cancelled) return;
      setCoverage(data);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  return { coverage, loading, refresh };
}
