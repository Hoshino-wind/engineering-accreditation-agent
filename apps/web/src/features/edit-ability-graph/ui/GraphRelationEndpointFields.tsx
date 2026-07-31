import {
  Col,
  Form,
  Row,
  Select,
  type FormInstance,
} from 'antd';

import type { AbilityGraphRelationDefinition } from '../../../entities/ability-graph';
import type { NewEdgeValues } from '../model/editAbilityGraphTypes';

interface SelectOption {
  label: string;
  value: string;
}

interface GraphRelationEndpointFieldsProps {
  definition?: AbilityGraphRelationDefinition;
  form: FormInstance<NewEdgeValues>;
  hasSelectedSource: boolean;
  sourceLabel: string;
  sourceOptions: SelectOption[];
  targetLabel: string;
  targetOptions: SelectOption[];
}

export function GraphRelationEndpointFields({
  definition,
  form,
  hasSelectedSource,
  sourceLabel,
  sourceOptions,
  targetLabel,
  targetOptions,
}: GraphRelationEndpointFieldsProps) {
  return (
    <Row gutter={12}>
      <Col span={12}>
        <Form.Item
          label={sourceLabel}
          name="sourceId"
          rules={[{ required: true }]}
        >
          <Select
            disabled={!definition}
            onChange={() =>
              form.resetFields([
                'targetId',
                'rationale',
                'targetBehaviors',
              ])
            }
            options={sourceOptions}
            placeholder={
              definition
                ? `选择${sourceLabel}`
                : '先选择关系类型'
            }
            showSearch={{ optionFilterProp: 'label' }}
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          label={targetLabel}
          name="targetId"
          rules={[{ required: true }]}
        >
          <Select
            disabled={!definition || !hasSelectedSource}
            onChange={() =>
              form.resetFields(['rationale', 'targetBehaviors'])
            }
            options={targetOptions}
            placeholder={
              definition && hasSelectedSource
                ? `选择${targetLabel}`
                : '先选择关系类型和来源对象'
            }
            showSearch={{ optionFilterProp: 'label' }}
          />
        </Form.Item>
      </Col>
    </Row>
  );
}
