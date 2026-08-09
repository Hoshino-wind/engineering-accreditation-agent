/**
 * useDiagnosticFindings — 从后端诊断库加载真实发现数据的 Hook。
 *
 * 供 ④ 图谱诊断页的发现处置区使用；处置写入后通过 updateFinding
 * 同步刷新列表状态。
 */

import { useCallback, useEffect, useState } from 'react';

import { fetchFindings } from '../../../shared/api/diagnosticsClient';
import type { DiagnosticFinding } from './diagnosticFinding';
import { mapDiagnosticFinding } from './diagnosticFindingMapper';

export function useDiagnosticFindings() {
  const [findings, setFindings] = useState<DiagnosticFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const data = await fetchFindings();
    setLoadFailed(data === null);
    setFindings(data ? data.map(mapDiagnosticFinding) : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const updateFinding = useCallback((updated: DiagnosticFinding) => {
    setFindings((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item)),
    );
  }, []);

  return { findings, loadFailed, loading, reload, updateFinding };
}
