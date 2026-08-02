import { DatabaseOutlined } from '@ant-design/icons';
import { Button, Form, Modal } from 'antd';
import type { ButtonProps } from 'antd';
import { useState } from 'react';

import type {
  AttainmentEvaluationItem,
  AttainmentEvaluationPreflight,
} from '../../../entities/attainment-evaluation';
import { buildPilotScoreBatchItems } from '../lib/pilotScoreBatchInput';
import {
  createPilotScoreBatchIntent,
  type CapturePilotScoreBatchIntent,
  type PilotScoreBatchFormValues,
} from '../model/pilotScoreBatchIntent';
import {
  type CapturePilotScoreBatchInput,
  useCapturePilotScoreBatch,
} from '../model/useCapturePilotScoreBatch';
import { PilotScoreBatchForm } from './PilotScoreBatchForm';
import { PilotScoreBatchResult } from './PilotScoreBatchResult';

import './capturePilotScoreBatch.css';

interface CapturePilotScoreBatchProps {
  block?: boolean;
  evaluation: AttainmentEvaluationItem;
  preflight: AttainmentEvaluationPreflight;
  size?: ButtonProps['size'];
  type?: ButtonProps['type'];
}

export function CapturePilotScoreBatch({
  block,
  evaluation,
  preflight,
  size = 'small',
  type = 'primary',
}: CapturePilotScoreBatchProps) {
  const [form] = Form.useForm<PilotScoreBatchFormValues>();
  const [intent, setIntent] = useState<CapturePilotScoreBatchIntent>();
  const [submission, setSubmission] =
    useState<CapturePilotScoreBatchInput>();
  const [formError, setFormError] = useState<string>();
  const mutation = useCapturePilotScoreBatch();
  const scorePreparationAllowed = Boolean(
    preflight.runId === evaluation.runId &&
      preflight.evaluationObjectId === evaluation.id &&
      preflight.checks.some(
        (check) =>
          check.status === 'blocked' &&
          check.action === 'prepare_score_data',
      ),
  );

  const handleOpen = () => {
    if (!scorePreparationAllowed || evaluation.inputs.length === 0) {
      return;
    }
    mutation.reset();
    setSubmission(undefined);
    setFormError(undefined);
    setIntent(createPilotScoreBatchIntent(evaluation));
  };

  const handleClose = () => {
    if (mutation.isPending) {
      return;
    }
    mutation.reset();
    setSubmission(undefined);
    setFormError(undefined);
    setIntent(undefined);
  };

  const handleSubmit = async () => {
    if (!intent) {
      return;
    }
    let request = submission;
    if (!request) {
      try {
        const values = await form.validateFields();
        request = {
          baseRunId: intent.baseRunId,
          evaluationObjectId: intent.evaluationObjectId,
          idempotencyKey: intent.idempotencyKey,
          items: buildPilotScoreBatchItems(intent.inputs, values.items),
        };
        setSubmission(request);
        setFormError(undefined);
      } catch (error) {
        if (error instanceof Error) {
          setFormError(error.message);
        }
        return;
      }
    }
    try {
      await mutation.mutateAsync(request);
    } catch {
      // 同一次重试保留原请求与原幂等键，避免产生重复批次。
    }
  };

  const created = mutation.data;
  const serviceDisabled =
    mutation.error?.code === 'pilot_score_batch_capture_disabled' ||
    mutation.error?.status === 503;

  return (
    <>
      <Button
        block={block}
        disabled={!scorePreparationAllowed || evaluation.inputs.length === 0}
        icon={<DatabaseOutlined />}
        onClick={handleOpen}
        size={size}
        type={type}
      >
        创建试点汇总准备批次
      </Button>

      <Modal
        cancelButtonProps={{ disabled: mutation.isPending }}
        cancelText="取消"
        closable={!mutation.isPending}
        confirmLoading={mutation.isPending}
        destroyOnHidden
        footer={
          created ? (
            <Button onClick={handleClose} type="primary">
              关闭
            </Button>
          ) : undefined
        }
        keyboard={!mutation.isPending}
        mask={{ closable: !mutation.isPending }}
        okButtonProps={{ disabled: mutation.isPending }}
        okText={
          mutation.error ? '使用同一幂等键重试' : '创建批次'
        }
        onCancel={handleClose}
        onOk={() => {
          void handleSubmit();
        }}
        open={Boolean(intent)}
        title="创建试点汇总准备批次"
        width={960}
      >
        {intent && created ? (
          <PilotScoreBatchResult
            baseRunId={intent.baseRunId}
            created={created}
          />
        ) : null}

        {intent && !created ? (
          <PilotScoreBatchForm
            errorMessage={mutation.error?.message}
            fieldsLocked={Boolean(submission) || mutation.isPending}
            form={form}
            formError={formError}
            intent={intent}
            serviceDisabled={serviceDisabled}
          />
        ) : null}
      </Modal>
    </>
  );
}
