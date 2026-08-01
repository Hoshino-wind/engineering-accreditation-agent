// M4 提取任务状态管理 Hook
import { useCallback, useState } from 'react';

import type { UploadedMaterial } from '../../../entities/uploaded-material';
import {
  extractNodesFromMaterial,
  type ExtractedNode,
  type ExtractionResult,
} from './extractNodes';

export type ExtractionTaskStatus = 'idle' | 'running' | 'done' | 'error';

export interface ExtractionTaskState {
  status: ExtractionTaskStatus;
  material: UploadedMaterial | null;
  nodes: ExtractedNode[];
  // AI 调用元数据（用于展示调用细节）
  model?: string;
  usage?: { prompt_tokens: number; completion_tokens: number };
  latency?: number;
  errorMessage?: string;
}

const initialState: ExtractionTaskState = {
  status: 'idle',
  material: null,
  nodes: [],
};

// 管理 AI 提取任务的生命周期
export function useExtractionTask() {
  const [state, setState] = useState<ExtractionTaskState>(initialState);

  const startExtraction = useCallback(
    async (material: UploadedMaterial) => {
      setState({ status: 'running', material, nodes: [] });
      try {
        const result: ExtractionResult = await extractNodesFromMaterial(material);
        setState({
          status: 'done',
          material,
          nodes: result.nodes,
          model: result.model,
          usage: result.usage,
          latency: result.latency,
        });
      } catch {
        setState({
          status: 'error',
          material,
          nodes: [],
          errorMessage: 'AI 提取服务异常，请稍后重试',
        });
      }
    },
    [],
  );

  const toggleNode = useCallback((nodeId: string) => {
    setState((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.node.id === nodeId ? { ...n, selected: !n.selected } : n,
      ),
    }));
  }, []);

  const selectAll = useCallback((selected: boolean) => {
    setState((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => ({ ...n, selected })),
    }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    ...state,
    startExtraction,
    toggleNode,
    selectAll,
    reset,
    selectedCount: state.nodes.filter((n) => n.selected).length,
  };
}
