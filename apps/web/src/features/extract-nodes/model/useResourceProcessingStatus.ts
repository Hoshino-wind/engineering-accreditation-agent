// 资源处理状态轮询 Hook
// 为单个材料轮询 pipeline 全局进度，达到终态或后端不可用时停止
import { useEffect, useRef, useState } from 'react';

import {
  fetchPipelineStatus,
  type PipelineStage,
} from '../../../shared/api/pipelineClient';

const POLL_INTERVAL = 3000; // 每 3 秒轮询一次
// 连续 N 次拿不到状态则视为后端不可用，停止轮询
const MAX_CONSECUTIVE_NULL = 3;

// 处理中阶段：提取或审核
const PROCESSING_STAGES: ReadonlySet<PipelineStage> = new Set([
  'extracting',
  'reviewing',
]);
// 终态：完成后停止轮询
const TERMINAL_STAGE: PipelineStage = 'done';

export interface ResourceProcessingStatus {
  stage: PipelineStage;
  progress: number; // 0-1
  message: string;
  isProcessing: boolean;
}

const INITIAL_STATUS: ResourceProcessingStatus = {
  stage: 'idle',
  progress: 0,
  message: '',
  isProcessing: false,
};

/**
 * 轮询单个材料的处理进度。
 * 当 stage 为 'extracting' 或 'reviewing' 时 isProcessing=true。
 * 当 stage 变为 'done' 或后端连续不可用时停止轮询。
 */
export function useResourceProcessingStatus(
  materialId: string,
): ResourceProcessingStatus {
  const [status, setStatus] = useState<ResourceProcessingStatus>(INITIAL_STATUS);
  const stoppedRef = useRef(false);

  useEffect(() => {
    stoppedRef.current = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let nullCount = 0;

    const poll = async () => {
      if (stoppedRef.current) return;

      const result = await fetchPipelineStatus();
      if (stoppedRef.current) return;

      if (!result) {
        // 后端不可用：累计失败次数，超过阈值则停止
        nullCount += 1;
        if (nullCount >= MAX_CONSECUTIVE_NULL) {
          stoppedRef.current = true;
          return;
        }
      } else {
        nullCount = 0;
        setStatus({
          stage: result.stage,
          progress: result.progress,
          message: result.message,
          isProcessing: PROCESSING_STAGES.has(result.stage),
        });
        // 达到终态：停止轮询
        if (result.stage === TERMINAL_STAGE) {
          stoppedRef.current = true;
          return;
        }
      }

      timer = setTimeout(poll, POLL_INTERVAL);
    };

    void poll();

    return () => {
      stoppedRef.current = true;
      if (timer) clearTimeout(timer);
    };
  }, [materialId]);

  return status;
}
