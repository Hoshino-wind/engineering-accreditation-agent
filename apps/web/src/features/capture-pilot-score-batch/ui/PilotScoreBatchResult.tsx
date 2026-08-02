import {
  Alert,
  Descriptions,
  Result,
  Space,
  Tag,
  Typography,
} from 'antd';

import type { CreatedScoreImportBatch } from '../../../entities/score-import-batch';

interface PilotScoreBatchResultProps {
  baseRunId: string;
  created: CreatedScoreImportBatch;
}

export function PilotScoreBatchResult({
  baseRunId,
  created,
}: PilotScoreBatchResultProps) {
  const { batch } = created;
  const validationPassed =
    batch.validationReport.validationStatus === 'pilot_ready';
  const blockedChecks = batch.validationReport.checks.filter(
    (check) => check.status === 'blocked',
  );

  return (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <Result
        status={validationPassed ? 'success' : 'warning'}
        subTitle={
          validationPassed
            ? '汇总值已形成不可变批次并通过当前试点校验。'
            : `批次已保留，当前校验仍有 ${blockedChecks.length} 项阻断。`
        }
        title={
          validationPassed
            ? '试点汇总准备批次已创建'
            : '试点汇总准备批次已创建，但校验存在阻断'
        }
      />

      <Alert
        description={`历史运行 ${baseRunId} 的阻断状态未改变，不会自动重新预检，也不会生成新的评价运行。该批次 formalUsable=false，不用于正式评价。`}
        showIcon
        title="历史运行与正式边界保持不变"
        type="info"
      />

      <Descriptions
        bordered
        column={2}
        items={[
          {
            key: 'batch',
            label: '批次 ID',
            children: (
              <Typography.Text copyable={{ text: batch.batchId }}>
                {batch.batchId}
              </Typography.Text>
            ),
            span: 2,
          },
          {
            key: 'status',
            label: '试点校验',
            children: (
              <Tag color={validationPassed ? 'success' : 'error'}>
                {validationPassed ? '通过' : '阻断'}
              </Tag>
            ),
          },
          {
            key: 'replay',
            label: '提交结果',
            children: created.idempotentReplay
              ? '按原幂等键恢复，未重复创建'
              : '首次创建',
          },
          {
            key: 'coverage',
            label: '汇总输入',
            children: `${batch.candidateItems.length} 项`,
          },
          {
            key: 'records',
            label: '规范记录',
            children: `${batch.records.length} 项`,
          },
          {
            key: 'source',
            label: '数据形态',
            children: '结构化聚合值',
          },
          {
            key: 'formal',
            label: '正式可用',
            children: <Tag color="default">否</Tag>,
          },
        ]}
        size="small"
      />

      {!validationPassed ? (
        <section className="pilot-score-batch-result__checks">
          <Typography.Title level={5}>阻断检查</Typography.Title>
          {blockedChecks.map((check) => (
            <article key={check.code}>
              <div>
                <Typography.Text code>{check.code}</Typography.Text>
                <Tag color="error">阻断</Tag>
              </div>
              <Typography.Text>
                受影响输入：
                {check.affectedInputIds.length > 0
                  ? check.affectedInputIds.join('、')
                  : '未标注'}
              </Typography.Text>
              <Typography.Text type="secondary">
                预期：{check.expected}；实际：{check.observed}
              </Typography.Text>
            </article>
          ))}
        </section>
      ) : null}
    </Space>
  );
}
