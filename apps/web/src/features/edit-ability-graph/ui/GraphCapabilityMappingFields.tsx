import { Form, Input, Select } from 'antd';

interface SelectOption {
  label: string;
  value: string;
}

interface GraphCapabilityMappingFieldsProps {
  options: SelectOption[];
}

export function GraphCapabilityMappingFields({
  options,
}: GraphCapabilityMappingFieldsProps) {
  return (
    <>
      <Form.Item
        label="映射可观察行为"
        name="targetBehaviors"
        rules={[
          {
            required: true,
            message: '至少映射一项指标点行为',
          },
        ]}
      >
        <Select
          mode="multiple"
          options={options}
          placeholder="选择该课程目标实际承载的指标点行为"
        />
      </Form.Item>
      <Form.Item
        label="支撑理由"
        name="rationale"
        rules={[{ required: true }]}
      >
        <Input.TextArea
          placeholder="说明课程目标、教学活动与目标行为之间的可验证联系"
          rows={2}
        />
      </Form.Item>
    </>
  );
}
