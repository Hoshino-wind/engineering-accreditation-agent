import { Form, Input, Modal } from 'antd';

import {
  type AbilityGraphRelationType,
  type AbilityGraphState,
} from '../../../entities/ability-graph';
import type {
  MaterialSourceReference,
  NewEdgeValues,
} from '../model/editAbilityGraphTypes';
import { getGraphRelationFormModel } from '../model/graphRelationFormModel';
import { GraphCapabilityMappingFields } from './GraphCapabilityMappingFields';
import { GraphMaterialSourceFields } from './GraphMaterialSourceFields';
import { GraphRelationDefinitionFields } from './GraphRelationDefinitionFields';
import { GraphRelationEndpointFields } from './GraphRelationEndpointFields';

interface CreateGraphEdgeModalProps {
  graph: AbilityGraphState;
  isMaterialLoading: boolean;
  isSubmitting: boolean;
  materialReferences: MaterialSourceReference[];
  onCancel: () => void;
  onNavigateToResources: () => void;
  onSubmit: (values: NewEdgeValues) => Promise<boolean>;
  open: boolean;
}

export function CreateGraphEdgeModal({
  graph,
  isMaterialLoading,
  isSubmitting,
  materialReferences,
  onCancel,
  onNavigateToResources,
  onSubmit,
  open,
}: CreateGraphEdgeModalProps) {
  const [form] = Form.useForm<NewEdgeValues>();
  const selectedRelationType: AbilityGraphRelationType | undefined =
    Form.useWatch('relation', form);
  const selectedSourceId = Form.useWatch('sourceId', form);
  const selectedTargetId = Form.useWatch('targetId', form);
  const relationForm = getGraphRelationFormModel(
    graph,
    selectedRelationType,
    selectedSourceId,
    selectedTargetId,
  );

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (await onSubmit(values)) {
        form.resetFields();
      }
    } catch {
      // 校验错误由 Form 字段展示，避免把 reject 泄漏为未处理异常。
    }
  };
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      form.setFieldValue('effectiveCycle', '2025—2026 学年');
      return;
    }
    form.resetFields();
  };

  return (
    <Modal
      afterOpenChange={handleOpenChange}
      confirmLoading={isSubmitting}
      destroyOnHidden
      okButtonProps={{
        disabled: materialReferences.length === 0 || isSubmitting,
      }}
      okText="加入草稿"
      onCancel={onCancel}
      onOk={handleSubmit}
      open={open}
      title="新建图谱关系"
      width={720}
    >
      <Form
        clearOnDestroy
        form={form}
        layout="vertical"
      >
        <GraphRelationDefinitionFields
          definition={relationForm.definition}
          form={form}
          sourceLabel={relationForm.sourceLabel}
          targetLabel={relationForm.targetLabel}
        />
        <GraphRelationEndpointFields
          definition={relationForm.definition}
          form={form}
          hasSelectedSource={Boolean(relationForm.sourceNode)}
          sourceLabel={relationForm.sourceLabel}
          sourceOptions={relationForm.sourceOptions}
          targetLabel={relationForm.targetLabel}
          targetOptions={relationForm.targetOptions}
        />
        {relationForm.requiresCapabilityMapping ? (
          <GraphCapabilityMappingFields
            options={relationForm.targetBehaviorOptions}
          />
        ) : null}
        <Form.Item
          label="生效周期"
          name="effectiveCycle"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <GraphMaterialSourceFields
          emptyDescription="当前没有可引用的证据片段。请先上传并解析材料，再返回创建图谱关系。"
          isMaterialLoading={isMaterialLoading}
          materialReferences={materialReferences}
          onNavigateToResources={onNavigateToResources}
          readyDescription="关系来源固定到材料版本和证据片段；这里不再接受手工拼写的来源 ID。"
        />
      </Form>
    </Modal>
  );
}
