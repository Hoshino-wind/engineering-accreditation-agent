import { Descriptions, Tag, Typography } from 'antd';

import type { AttainmentEvaluationItem } from '../../../entities/attainment-evaluation';

interface EvaluationRunSourceSummaryProps {
  source: AttainmentEvaluationItem;
}

function compactDigest(digest: string) {
  if (digest.length <= 36) {
    return digest;
  }
  return `${digest.slice(0, 24)}…${digest.slice(-10)}`;
}

export function EvaluationRunSourceSummary({
  source,
}: EvaluationRunSourceSummaryProps) {
  return (
    <Descriptions
      bordered
      column={2}
      items={[
        {
          key: 'object',
          label: '评价对象',
          children: `${source.course} · ${source.objectiveCode}`,
          span: 2,
        },
        {
          key: 'source-run',
          label: '来源运行',
          children: source.runId,
        },
        {
          key: 'readiness',
          label: '输入状态',
          children: source.calculation.ready ? (
            <Tag color="success">已就绪</Tag>
          ) : (
            <Tag color="error">被阻断</Tag>
          ),
        },
        {
          key: 'graph',
          label: '图谱版本',
          children: source.graphVersion,
        },
        {
          key: 'policy',
          label: '策略版本',
          children: source.policyVersion,
        },
        {
          key: 'score-snapshot',
          label: '评分快照',
          children: source.scoreSnapshot,
        },
        {
          key: 'students',
          label: '样本范围',
          children: `${source.studentCount} 名学生`,
        },
        {
          key: 'threshold',
          label: '达成阈值',
          children: `${Math.round(source.threshold * 100)}%`,
        },
        {
          key: 'program',
          label: '来源程序',
          children: source.programVersion,
        },
        {
          key: 'snapshot-hash',
          label: '输入完整性哈希',
          children: (
            <Typography.Text title={source.inputSnapshot.hash}>
              {compactDigest(source.inputSnapshot.hash)}
            </Typography.Text>
          ),
          span: 2,
        },
      ]}
      size="small"
    />
  );
}
