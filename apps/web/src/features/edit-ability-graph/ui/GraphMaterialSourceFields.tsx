import { Alert, Button, Form, Select } from 'antd';

import type { MaterialSourceReference } from '../model/editAbilityGraphTypes';

interface GraphMaterialSourceFieldsProps {
  emptyDescription: string;
  isMaterialLoading: boolean;
  materialReferences: MaterialSourceReference[];
  onNavigateToResources: () => void;
  readyDescription: string;
}

export function GraphMaterialSourceFields({
  emptyDescription,
  isMaterialLoading,
  materialReferences,
  onNavigateToResources,
  readyDescription,
}: GraphMaterialSourceFieldsProps) {
  const hasReferences = materialReferences.length > 0;

  return (
    <>
      <Form.Item
        label="来源证据片段"
        name="sourceRefKey"
        rules={[{ required: true }]}
      >
        <Select
          loading={isMaterialLoading}
          notFoundContent={
            isMaterialLoading
              ? '正在读取材料版本…'
              : '暂无已解析的证据片段'
          }
          options={materialReferences.map((item) => ({
            label: item.label,
            value: item.key,
          }))}
          placeholder="从已解析的材料版本中选择"
          showSearch={{ optionFilterProp: 'label' }}
        />
      </Form.Item>
      <Alert
        action={
          hasReferences ? undefined : (
            <Button onClick={onNavigateToResources} size="small">
              先准备材料
            </Button>
          )
        }
        description={
          hasReferences ? readyDescription : emptyDescription
        }
        showIcon
        type={hasReferences ? 'info' : 'warning'}
      />
    </>
  );
}
