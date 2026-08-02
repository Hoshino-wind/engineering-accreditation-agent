import { PlayCircleOutlined } from '@ant-design/icons';
import {
  Alert,
  App,
  Button,
  Modal,
  Skeleton,
  Space,
} from 'antd';
import { useState } from 'react';

import {
  type AttainmentEvaluationItem,
  type AttainmentEvaluationSummary,
  useAttainmentEvaluationRunQuery,
} from '../../../entities/attainment-evaluation';
import { useCreateAttainmentEvaluationRun } from '../model/useCreateAttainmentEvaluationRun';
import { EvaluationRunSourceSummary } from './EvaluationRunSourceSummary';

interface CreateIntent {
  evaluation: AttainmentEvaluationSummary;
  idempotencyKey: string;
  sourceRunId: string;
}

interface CreateAttainmentEvaluationRunProps {
  evaluation?: AttainmentEvaluationSummary;
  onCreated: (run: AttainmentEvaluationItem) => void;
  sourceRunId?: string;
}

function createIdempotencyKey() {
  if (typeof globalThis.crypto.randomUUID === 'function') {
    return `m6-run:${globalThis.crypto.randomUUID()}`;
  }
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  return `m6-run:${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function CreateAttainmentEvaluationRun({
  evaluation,
  onCreated,
  sourceRunId,
}: CreateAttainmentEvaluationRunProps) {
  const { message } = App.useApp();
  const [intent, setIntent] = useState<CreateIntent>();
  const mutation = useCreateAttainmentEvaluationRun();
  const sourceQuery = useAttainmentEvaluationRunQuery(
    intent?.sourceRunId,
    Boolean(intent),
  );
  const source = sourceQuery.data;
  const sourceMatchesIntent = Boolean(
    source &&
      source.runId === intent?.sourceRunId &&
      source.id === intent?.evaluation.id,
  );
  const readyToRun = Boolean(
    sourceMatchesIntent && source?.calculation.ready,
  );
  const isNonPresentedSource = Boolean(
    intent &&
      intent.sourceRunId !== intent.evaluation.presentedRunId,
  );

  const handleOpen = () => {
    if (!evaluation || !sourceRunId) {
      return;
    }
    mutation.reset();
    setIntent({
      evaluation,
      idempotencyKey: createIdempotencyKey(),
      sourceRunId,
    });
  };

  const handleClose = () => {
    if (mutation.isPending) {
      return;
    }
    mutation.reset();
    setIntent(undefined);
  };

  const handleCreate = async () => {
    if (!intent || !readyToRun) {
      return;
    }
    try {
      const created = await mutation.mutateAsync({
        evaluationObjectId: intent.evaluation.id,
        idempotencyKey: intent.idempotencyKey,
        sourceRunId: intent.sourceRunId,
      });
      setIntent(undefined);
      onCreated(created.run);
      void message.success(
        created.idempotentReplay
          ? '已恢复先前创建的运行，未产生重复运行'
          : '试点重算运行已创建，队列焦点保持不变',
      );
    } catch {
      // 错误保留在 mutation 中，同一次重试继续使用原幂等键。
    }
  };

  const mutationError = mutation.error;

  return (
    <>
      <Button
        disabled={!evaluation || !sourceRunId}
        icon={<PlayCircleOutlined />}
        onClick={handleOpen}
        type="primary"
      >
        运行评价
      </Button>
      <Modal
        cancelButtonProps={{ disabled: mutation.isPending }}
        cancelText="取消"
        closable={!mutation.isPending}
        confirmLoading={mutation.isPending}
        destroyOnHidden
        keyboard={!mutation.isPending}
        mask={{ closable: !mutation.isPending }}
        okButtonProps={{
          disabled: !readyToRun || mutation.isPending,
        }}
        okText={mutationError ? '重试创建' : '确认并运行'}
        onCancel={handleClose}
        onOk={() => {
          void handleCreate();
        }}
        open={Boolean(intent)}
        title="基于已就绪快照运行评价"
        width={680}
      >
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          <Alert
            description="服务端会复制并固定当前输入，在当前评价程序版本下同步重算；来源运行和左侧队列焦点都不会被修改。"
            showIcon
            title="创建新的指定运行"
            type="info"
          />

          {isNonPresentedSource ? (
            <Alert
              description={`本次精确使用 ${intent?.sourceRunId}，不会静默切回队列展示运行 ${intent?.evaluation.presentedRunId}。`}
              showIcon
              title="正在基于非队列焦点运行重算"
              type="warning"
            />
          ) : null}

          {sourceQuery.isPending ? (
            <Skeleton active paragraph={{ rows: 7 }} />
          ) : null}

          {sourceQuery.isError || (sourceQuery.isSuccess && !sourceMatchesIntent) ? (
            <Alert
              description="无法读取本次创建意图对应的权威来源运行，请取消后重新选择。"
              showIcon
              title="来源运行不可用"
              type="error"
            />
          ) : null}

          {sourceMatchesIntent && source ? (
            <>
              <EvaluationRunSourceSummary source={source} />

              {!source.calculation.ready ? (
                <Alert
                  description={source.calculation.blockers.join('；')}
                  showIcon
                  title="请先补齐输入，再创建重算运行"
                  type="error"
                />
              ) : null}
            </>
          ) : null}

          {mutationError ? (
            <Alert
              description={
                mutationError.blockers.length > 0
                  ? `${mutationError.message}：${mutationError.blockers.join('；')}`
                  : mutationError.message
              }
              showIcon
              title="运行创建失败"
              type="error"
            />
          ) : null}
        </Space>
      </Modal>
    </>
  );
}
