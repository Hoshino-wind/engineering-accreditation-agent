import { Handle, Position } from '@xyflow/react';
import type { CSSProperties } from 'react';

import {
  type AbilityGraphNode,
  nodeKindPresentation,
} from '../../../entities/ability-graph';
import './abilityGraphCanvas.css';

// 图谱节点卡（深色控制台风格）：
// - 深色玻璃底 + 左侧类型色竖条（类型色通过 CSS 变量 --node-accent 注入）
// - 第一行：类型标签 + 来源徽标（标准=内置认证标准，上传=学校材料提取）
// - 第二行：名称（白字，最多两行）
// - 第三行：编号（等宽字体，数据感）
export function AbilityGraphNodeCard({
  data,
}: {
  data: AbilityGraphNode | Record<string, unknown>;
}) {
  const node = data as AbilityGraphNode;
  const presentation = nodeKindPresentation[node.kind];
  const isStandard = node.origin === 'standard';

  return (
    <div
      className={`ability-graph-node ability-graph-node-card ${
        isStandard
          ? 'ability-graph-node-standard'
          : 'ability-graph-node-school'
      }`}
      style={{ '--node-accent': presentation.color } as CSSProperties}
    >
      <Handle
        position={Position.Top}
        type="target"
        className="ability-graph-handle"
        id="t"
      />
      <Handle
        position={Position.Bottom}
        type="target"
        className="ability-graph-handle"
        id="b"
      />
      <Handle
        position={Position.Left}
        type="target"
        className="ability-graph-handle"
        id="l"
      />
      <Handle
        position={Position.Right}
        type="target"
        className="ability-graph-handle"
        id="r"
      />
      <Handle
        position={Position.Top}
        type="source"
        className="ability-graph-handle"
        id="s-t"
      />
      <Handle
        position={Position.Bottom}
        type="source"
        className="ability-graph-handle"
        id="s-b"
      />
      <Handle
        position={Position.Left}
        type="source"
        className="ability-graph-handle"
        id="s-l"
      />
      <Handle
        position={Position.Right}
        type="source"
        className="ability-graph-handle"
        id="s-r"
      />
      <span className="ability-graph-node-accent" />
      <div className="ability-graph-node-top">
        <span className="ability-graph-node-kind">{presentation.label}</span>
        <span
          className={`ability-graph-node-origin ${
            isStandard
              ? 'ability-graph-node-origin-standard'
              : 'ability-graph-node-origin-school'
          }`}
        >
          {isStandard ? '标准' : '上传'}
        </span>
      </div>
      <div className="ability-graph-node-name">{node.name}</div>
      <div className="ability-graph-node-code">{node.code}</div>
    </div>
  );
}
