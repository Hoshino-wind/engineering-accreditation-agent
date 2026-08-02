import { ToolOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import type { ButtonProps } from 'antd';
import { useState } from 'react';
import type { ReactNode } from 'react';

import type {
  AttainmentEvaluationItem,
  AttainmentEvaluationPreflight,
} from '../../../entities/attainment-evaluation';
import { AttainmentInputPreflightDrawer } from './AttainmentInputPreflightDrawer';

export interface AttainmentInputResolutionContext {
  evaluation: AttainmentEvaluationItem;
  report: AttainmentEvaluationPreflight;
}

interface InspectAttainmentInputPreflightProps {
  block?: boolean;
  evaluation: AttainmentEvaluationItem;
  label?: string;
  onNavigateToAbilityGraph?: () => void;
  renderScoreInputAction?: (
    context: AttainmentInputResolutionContext,
  ) => ReactNode;
  size?: ButtonProps['size'];
  type?: ButtonProps['type'];
}

export function InspectAttainmentInputPreflight({
  block,
  evaluation,
  label = '处理输入问题',
  onNavigateToAbilityGraph,
  renderScoreInputAction,
  size,
  type = 'primary',
}: InspectAttainmentInputPreflightProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        block={block}
        icon={<ToolOutlined />}
        onClick={() => setOpen(true)}
        size={size}
        type={type}
      >
        {label}
      </Button>
      <AttainmentInputPreflightDrawer
        evaluation={evaluation}
        onClose={() => setOpen(false)}
        onNavigateToAbilityGraph={onNavigateToAbilityGraph}
        open={open}
        renderScoreInputAction={renderScoreInputAction}
      />
    </>
  );
}
