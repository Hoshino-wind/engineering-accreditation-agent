import { Handle, Position } from '@xyflow/react';
import { Typography } from 'antd';

import {
  type AbilityGraphNode,
  nodeKindPresentation,
} from '../../../entities/ability-graph';
import './abilityGraphCanvas.css';

// 原型图 [prototype.html#L837-L849] 节点是纯色块：
// 毕业要求 #C53030 / 能力 #DD6B20 / 课程 #2B6CB0 / 实验 #6B46C1 / 知识点 #319795 / 资源 #2D7A4F
// 白字 + 圆角矩形色块，不是白底带边框的卡片
// 标准节点（毕业要求/能力指标）加"标准"角标，学校上传节点加"上传"角标
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
      className={`ability-graph-node ability-graph-node-block ${isStandard ? 'ability-graph-node-standard' : 'ability-graph-node-school'}`}
      style={{
        background: presentation.solid ?? presentation.color,
      }}
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
      <span className="ability-graph-node-origin">
        {isStandard ? '标准' : '上传'}
      </span>
      <div className="ability-graph-node-header ability-graph-node-header-white">
        <span className="ability-graph-node-kind">{presentation.label}</span>
        <span className="ability-graph-node-code ability-graph-node-code-white">
          {node.code}
        </span>
      </div>
      <Typography.Text
        className="ability-graph-node-name ability-graph-node-name-white"
        strong
      >
        {node.name}
      </Typography.Text>
    </div>
  );
}
