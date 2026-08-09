import {
  type AbilityGraphNodeKind,
  nodeKindPresentation,
} from '../../../entities/ability-graph';
import './abilityGraphCanvas.css';

// 图谱列头：悬浮在每列节点上方，标明该列的业务维度与节点数
// 毕业要求 → 能力指标 → 课程 → 实验项目 → 知识点 → 教学资源
export function AbilityGraphColumnHeader({
  data,
}: {
  data: { kind: AbilityGraphNodeKind; count: number } | Record<string, unknown>;
}) {
  const { kind, count } = data as {
    kind: AbilityGraphNodeKind;
    count: number;
  };
  const presentation = nodeKindPresentation[kind];
  return (
    <div className="ability-graph-col-header">
      <span
        className="ability-graph-col-header-dot"
        style={{ background: presentation.color }}
      />
      <span className="ability-graph-col-header-label">{presentation.label}</span>
      <span className="ability-graph-col-header-count">×{count}</span>
    </div>
  );
}
