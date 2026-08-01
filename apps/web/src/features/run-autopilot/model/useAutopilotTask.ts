// Autopilot 一键分析任务状态管理 Hook
import { useCallback, useState } from 'react';

import { runAutopilot, type AutopilotRunResponse } from './autopilot';

export type AutopilotTaskStatus = 'idle' | 'running' | 'done' | 'error';

export interface AutopilotTaskState {
  status: AutopilotTaskStatus;
  // 当前正在分析的资源 ID（用于按钮 loading）
  loadingResourceId: string | null;
  result: AutopilotRunResponse | null;
  errorMessage?: string;
}

const initialState: AutopilotTaskState = {
  status: 'idle',
  loadingResourceId: null,
  result: null,
};

// 管理一键自动分析任务的生命周期
export function useAutopilotTask() {
  const [state, setState] = useState<AutopilotTaskState>(initialState);

  const run = useCallback(async (resourceId: string, course?: string) => {
    setState({
      status: 'running',
      loadingResourceId: resourceId,
      result: null,
    });
    try {
      const result = await runAutopilot({ resource_id: resourceId, course });
      setState({
        status: 'done',
        loadingResourceId: resourceId,
        result,
      });
      return result;
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : '自动分析服务异常，请稍后重试';
      setState({
        status: 'error',
        loadingResourceId: resourceId,
        result: null,
        errorMessage,
      });
      throw e;
    }
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    ...state,
    run,
    reset,
  };
}
