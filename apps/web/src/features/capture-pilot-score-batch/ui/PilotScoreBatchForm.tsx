import {
  Alert,
  Checkbox,
  Descriptions,
  Form,
  Space,
  Tag,
  Typography,
} from 'antd';
import type { FormInstance } from 'antd';

import type {
  CapturePilotScoreBatchIntent,
  PilotScoreBatchFormValues,
} from '../model/pilotScoreBatchIntent';
import { createPilotScoreBatchInitialValues } from '../model/pilotScoreBatchIntent';
import { PilotScoreBatchInputTable } from './PilotScoreBatchInputTable';

interface PilotScoreBatchFormProps {
  errorMessage?: string;
  fieldsLocked: boolean;
  form: FormInstance<PilotScoreBatchFormValues>;
  formError?: string;
  intent: CapturePilotScoreBatchIntent;
  serviceDisabled: boolean;
}

export function PilotScoreBatchForm({
  errorMessage,
  fieldsLocked,
  form,
  formError,
  intent,
  serviceDisabled,
}: PilotScoreBatchFormProps) {
  return (
    <Form<PilotScoreBatchFormValues>
      disabled={fieldsLocked}
      form={form}
      initialValues={createPilotScoreBatchInitialValues(intent)}
      key={intent.idempotencyKey}
      layout="vertical"
      requiredMark={false}
    >
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Alert
          description="这里只捕获当前运行全部评分输入的结构化汇总值，不接收姓名、学号或个人成绩明细。创建批次不会修改历史运行，也不会自动重新预检。"
          showIcon
          title="本地试点汇总边界"
          type="warning"
        />

        <Descriptions
          bordered
          column={2}
          items={[
            {
              key: 'evaluation',
              label: '评价对象',
              children: intent.evaluationTitle,
            },
            {
              key: 'count',
              label: '必须覆盖',
              children: `${intent.inputs.length} 项评分输入`,
            },
            {
              key: 'run',
              label: '历史运行',
              children: intent.baseRunId,
            },
            {
              key: 'students',
              label: '运行样本范围',
              children: `${intent.studentCount} 名学生`,
            },
            {
              key: 'snapshot',
              label: '输入快照摘要',
              children: (
                <Typography.Text copyable={{ text: intent.inputSnapshotHash }}>
                  {intent.inputSnapshotHash}
                </Typography.Text>
              ),
              span: 2,
            },
          ]}
          size="small"
        />

        <section className="pilot-score-batch-form__section">
          <div className="pilot-score-batch-form__heading">
            <div>
              <Typography.Title level={5}>逐项汇总值</Typography.Title>
              <Typography.Text type="secondary">
                每一行对应当前运行中的一个评分输入，缺一不可。
              </Typography.Text>
            </div>
            <Tag color="blue">结构化聚合值</Tag>
          </div>
          <PilotScoreBatchInputTable form={form} inputs={intent.inputs} />
        </section>

        <Form.Item
          name="confirmedAggregateOnly"
          rules={[
            {
              validator(_, value) {
                return value === true
                  ? Promise.resolve()
                  : Promise.reject(
                      new Error('请先确认不含个人成绩明细'),
                    );
              },
            },
          ]}
          valuePropName="checked"
        >
          <Checkbox>
            确认仅录入汇总值，不含姓名、学号或个人成绩明细
          </Checkbox>
        </Form.Item>

        {formError ? (
          <Alert
            description={formError}
            showIcon
            title="请检查汇总表单"
            type="error"
          />
        ) : null}

        {errorMessage ? (
          <Alert
            description={`${errorMessage}。表单与本次提交内容已锁定保留；重试会复用同一幂等键。如需修改，请取消后重新打开。`}
            showIcon
            title={
              serviceDisabled
                ? '当前环境未启用试点汇总准备批次'
                : '试点汇总准备批次创建失败'
            }
            type="error"
          />
        ) : null}

        <Alert
          description={`批次创建后，历史运行 ${intent.baseRunId} 仍保持当前阻断状态；本步骤不会显示为可运行，也不用于正式评价。`}
          showIcon
          title="提交不会修补历史运行"
          type="info"
        />
      </Space>
    </Form>
  );
}
