/**
 * useAbilityGraphData — 获取真实后端图谱数据的 Hook。
 *
 * 从 /orchestration/graph 拉取（智能体运行后包含 AI 推断边），
 * 后端不可用时返回空图谱，由页面展示空态引导用户上传材料。
 * 提供 refresh() 供审核联动：识别中心/图谱侧栏作出审核决定后重新拉取。
 */

import { useCallback, useEffect, useState } from 'react';

import { fetchGraph, type GraphData } from '../../../shared/api/graphClient';
import type { AbilityGraphData } from './abilityGraph';

/** 将后端 camelCase dict 映射为前端 AbilityGraphData 接口 */
function toAbilityGraphData(raw: GraphData): AbilityGraphData {
  return {
    nodes: raw.nodes.map((n) => ({
      id: n.id,
      kind: n.kind as AbilityGraphData['nodes'][number]['kind'],
      code: n.code,
      name: n.name,
      origin: (n.origin as 'standard' | 'school') ?? 'school',
      description: n.description ?? undefined,
      properties: n.properties as Record<string, string | number | undefined> | undefined,
    })),
    edges: raw.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      kind: e.kind as AbilityGraphData['edges'][number]['kind'],
      sourceType: (e.sourceType as 'ai' | 'manual' | 'rule') ?? 'ai',
      reviewStatus: (e.reviewStatus as 'pending' | 'approved' | 'rejected' | 'modified') ?? 'pending',
      strength: (e.strength as 'strong' | 'medium' | 'weak') ?? undefined,
      confidence: e.confidence ?? undefined,
      aiReasoning: e.reasoning ?? undefined,
    })),
  };
}

export interface UseAbilityGraphResult {
  graph: AbilityGraphData;
  loading: boolean;
  /** 数据来源：'api' = 后端真实数据，'empty' = 后端未连接或无数据 */
  source: 'api' | 'empty';
  /** 重新向后端拉取图谱（审核决定写入后调用） */
  refresh: () => void;
}

export function useAbilityGraphData(): UseAbilityGraphResult {
  const [graph, setGraph] = useState<AbilityGraphData>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'api' | 'empty'>('empty');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const raw = await fetchGraph();
      if (cancelled) return;
      if (raw && raw.nodes.length > 0) {
        setGraph(toAbilityGraphData(raw));
        setSource('api');
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  return { graph, loading, source, refresh };
}
