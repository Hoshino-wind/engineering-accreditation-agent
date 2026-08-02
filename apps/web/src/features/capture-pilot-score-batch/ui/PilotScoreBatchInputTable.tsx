import { Form, InputNumber, Typography } from 'antd';
import type { FormInstance } from 'antd';

import type { EvaluationInput } from '../../../entities/attainment-evaluation';
import {
  canonicalizeDecimalText,
  compareCanonicalDecimals,
} from '../lib/pilotScoreBatchInput';
import type { PilotScoreBatchFormValues } from '../model/pilotScoreBatchIntent';

interface PilotScoreBatchInputTableProps {
  form: FormInstance<PilotScoreBatchFormValues>;
  inputs: EvaluationInput[];
}

function decimalFieldRule(
  input: EvaluationInput,
  field: 'earnedPointsTotal' | 'possiblePointsTotal',
  getCounterpart: () => unknown,
) {
  return {
    validator(_: unknown, value: unknown) {
      if (value === undefined || value === null || value === '') {
        return Promise.reject(
          new Error(
            field === 'earnedPointsTotal'
              ? '请输入已得总分'
              : '请输入应得总分',
          ),
        );
      }
      let current: string;
      try {
        current = canonicalizeDecimalText(value);
      } catch (error) {
        return Promise.reject(
          error instanceof Error ? error : new Error('总分格式不正确'),
        );
      }
      if (field === 'possiblePointsTotal' && current === '0') {
        return Promise.reject(new Error('应得总分必须大于 0'));
      }
      const counterpartValue = getCounterpart();
      if (
        counterpartValue === undefined ||
        counterpartValue === null ||
        counterpartValue === ''
      ) {
        return Promise.resolve();
      }
      let counterpart: string;
      try {
        counterpart = canonicalizeDecimalText(counterpartValue);
      } catch {
        return Promise.resolve();
      }
      const earned =
        field === 'earnedPointsTotal' ? current : counterpart;
      const possible =
        field === 'possiblePointsTotal' ? current : counterpart;
      return compareCanonicalDecimals(earned, possible) > 0
        ? Promise.reject(
            new Error(`${input.label}的已得总分不能超过应得总分`),
          )
        : Promise.resolve();
    },
  };
}

export function PilotScoreBatchInputTable({
  form,
  inputs,
}: PilotScoreBatchInputTableProps) {
  return (
    <>
      <div className="pilot-score-batch-form__grid pilot-score-batch-form__grid--header">
        <span>评分输入</span>
        <span>已得总分</span>
        <span>应得总分</span>
        <span>观察学生数</span>
      </div>
      <div className="pilot-score-batch-form__rows">
        {inputs.map((input, index) => (
          <div
            className="pilot-score-batch-form__grid pilot-score-batch-form__row"
            key={input.id}
          >
            <div className="pilot-score-batch-form__input-name">
              <Typography.Text strong>{input.label}</Typography.Text>
              <Typography.Text type="secondary">
                {input.evidenceName}
              </Typography.Text>
              <Typography.Text code>{input.id}</Typography.Text>
            </div>
            <Form.Item
              dependencies={[['items', index, 'possiblePointsTotal']]}
              name={['items', index, 'earnedPointsTotal']}
              rules={[
                decimalFieldRule(input, 'earnedPointsTotal', () =>
                  form.getFieldValue([
                    'items',
                    index,
                    'possiblePointsTotal',
                  ]),
                ),
              ]}
            >
              <InputNumber
                aria-label={`${input.label} 已得总分`}
                controls={false}
                min={0}
                placeholder="例如 321.5"
                stringMode
              />
            </Form.Item>
            <Form.Item
              dependencies={[['items', index, 'earnedPointsTotal']]}
              name={['items', index, 'possiblePointsTotal']}
              rules={[
                decimalFieldRule(input, 'possiblePointsTotal', () =>
                  form.getFieldValue([
                    'items',
                    index,
                    'earnedPointsTotal',
                  ]),
                ),
              ]}
            >
              <InputNumber
                aria-label={`${input.label} 应得总分`}
                controls={false}
                min={0}
                placeholder="例如 420"
                stringMode
              />
            </Form.Item>
            <Form.Item
              name={['items', index, 'observedStudentCount']}
              rules={[
                { message: '请输入观察学生数', required: true },
                { message: '观察学生数必须为正整数', type: 'integer' },
              ]}
            >
              <InputNumber
                aria-label={`${input.label} 观察学生数`}
                controls={false}
                min={1}
                precision={0}
              />
            </Form.Item>
          </div>
        ))}
      </div>
    </>
  );
}
