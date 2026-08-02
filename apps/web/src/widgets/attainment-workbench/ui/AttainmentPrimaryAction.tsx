import { ReloadOutlined } from '@ant-design/icons';
import { Button } from 'antd';

import {
  type AttainmentEvaluationItem,
  type AttainmentEvaluationSummary,
  useAttainmentEvaluationRunQuery,
} from '../../../entities/attainment-evaluation';
import { CreateAttainmentEvaluationRun } from '../../../features/create-attainment-evaluation-run';
import { AttainmentInputResolutionAction } from './AttainmentInputResolutionAction';

interface AttainmentPrimaryActionProps {
  evaluation?: AttainmentEvaluationSummary;
  onCreated: (run: AttainmentEvaluationItem) => void;
  onNavigateToAbilityGraph: () => void;
  sourceRunId?: string;
}

export function AttainmentPrimaryAction({
  evaluation,
  onCreated,
  onNavigateToAbilityGraph,
  sourceRunId,
}: AttainmentPrimaryActionProps) {
  const sourceQuery = useAttainmentEvaluationRunQuery(
    sourceRunId,
    Boolean(evaluation && sourceRunId),
  );
  const sourceMatchesSelection = Boolean(
    sourceQuery.data &&
      sourceQuery.data.runId === sourceRunId &&
      sourceQuery.data.id === evaluation?.id,
  );

  if (!evaluation || !sourceRunId) {
    return (
      <CreateAttainmentEvaluationRun
        evaluation={evaluation}
        onCreated={onCreated}
        sourceRunId={sourceRunId}
      />
    );
  }

  if (sourceQuery.isPending) {
    return (
      <Button loading type="primary">
        检查运行状态
      </Button>
    );
  }

  if (sourceQuery.isError) {
    return (
      <Button
        icon={<ReloadOutlined />}
        onClick={() => {
          void sourceQuery.refetch();
        }}
        type="primary"
      >
        重试运行状态
      </Button>
    );
  }

  if (!sourceMatchesSelection || !sourceQuery.data) {
    return (
      <Button disabled type="primary">
        运行状态不可用
      </Button>
    );
  }

  if (!sourceQuery.data.calculation.ready) {
    return (
      <AttainmentInputResolutionAction
        evaluation={sourceQuery.data}
        key={sourceQuery.data.runId}
        onNavigateToAbilityGraph={onNavigateToAbilityGraph}
      />
    );
  }

  return (
    <CreateAttainmentEvaluationRun
      evaluation={evaluation}
      onCreated={onCreated}
      sourceRunId={sourceRunId}
    />
  );
}
