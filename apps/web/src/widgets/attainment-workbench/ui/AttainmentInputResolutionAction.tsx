import type { ButtonProps } from 'antd';

import type { AttainmentEvaluationItem } from '../../../entities/attainment-evaluation';
import { CapturePilotScoreBatch } from '../../../features/capture-pilot-score-batch';
import { InspectAttainmentInputPreflight } from '../../../features/inspect-attainment-input-preflight';

interface AttainmentInputResolutionActionProps {
  block?: boolean;
  evaluation: AttainmentEvaluationItem;
  label?: string;
  onNavigateToAbilityGraph?: () => void;
  size?: ButtonProps['size'];
  type?: ButtonProps['type'];
}

export function AttainmentInputResolutionAction({
  block,
  evaluation,
  label,
  onNavigateToAbilityGraph,
  size,
  type,
}: AttainmentInputResolutionActionProps) {
  return (
    <InspectAttainmentInputPreflight
      block={block}
      evaluation={evaluation}
      label={label}
      onNavigateToAbilityGraph={onNavigateToAbilityGraph}
      renderScoreInputAction={({ evaluation: exactRun, report }) => (
        <CapturePilotScoreBatch
          evaluation={exactRun}
          preflight={report}
        />
      )}
      size={size}
      type={type}
    />
  );
}
