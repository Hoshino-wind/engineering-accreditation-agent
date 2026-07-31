import { Alert, Form, Select, type FormInstance } from 'antd';

import {
  abilityGraphRelationDefinitions,
  type AbilityGraphRelationDefinition,
} from '../../../entities/ability-graph';
import type { NewEdgeValues } from '../model/editAbilityGraphTypes';

interface GraphRelationDefinitionFieldsProps {
  definition?: AbilityGraphRelationDefinition;
  form: FormInstance<NewEdgeValues>;
  sourceLabel: string;
  targetLabel: string;
}

export function GraphRelationDefinitionFields({
  definition,
  form,
  sourceLabel,
  targetLabel,
}: GraphRelationDefinitionFieldsProps) {
  return (
    <>
      <Form.Item
        label="关系类型"
        name="relation"
        rules={[{ required: true }]}
      >
        <Select
          onChange={() =>
            form.resetFields([
              'sourceId',
              'targetId',
              'rationale',
              'targetBehaviors',
            ])
          }
          options={abilityGraphRelationDefinitions.map((item) => ({
            label: item.label,
            value: item.relation,
          }))}
          placeholder="选择要建立的关系"
        />
      </Form.Item>
      {definition ? (
        <Alert
          className="graph-schema-hint"
          description={definition.description}
          title={`${sourceLabel} → ${definition.label} → ${targetLabel}`}
          showIcon
          type="info"
        />
      ) : null}
    </>
  );
}
