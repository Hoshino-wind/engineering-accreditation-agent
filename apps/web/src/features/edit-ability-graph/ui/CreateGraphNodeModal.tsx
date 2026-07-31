import { Col, Form, Input, Modal, Row, Select } from 'antd';

import {
  abilityGraphCapabilityLevelLabels,
  abilityGraphNodeTypeLabels,
  type AbilityGraphNodeType,
} from '../../../entities/ability-graph';
import type {
  MaterialSourceReference,
  NewNodeValues,
} from '../model/editAbilityGraphTypes';
import { GraphMaterialSourceFields } from './GraphMaterialSourceFields';

interface CreateGraphNodeModalProps {
  isMaterialLoading: boolean;
  isSubmitting: boolean;
  materialReferences: MaterialSourceReference[];
  onCancel: () => void;
  onNavigateToResources: () => void;
  onSubmit: (values: NewNodeValues) => Promise<boolean>;
  open: boolean;
}

export function CreateGraphNodeModal({
  isMaterialLoading,
  isSubmitting,
  materialReferences,
  onCancel,
  onNavigateToResources,
  onSubmit,
  open,
}: CreateGraphNodeModalProps) {
  const [form] = Form.useForm<NewNodeValues>();
  const selectedNodeType: AbilityGraphNodeType | undefined = Form.useWatch(
    'type',
    form,
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
    if (!nextOpen) {
      form.resetFields();
    }
  };

  return (
    <Modal
      afterOpenChange={handleOpenChange}
      confirmLoading={isSubmitting}
      destroyOnHidden
      okButtonProps={{
        disabled: materialReferences.length === 0 || isSubmitting,
      }}
      okText="加入受控草稿"
      onCancel={onCancel}
      onOk={handleSubmit}
      open={open}
      title="新建图谱对象"
      width={720}
    >
      <Form clearOnDestroy form={form} layout="vertical">
        <Row gutter={12}>
          <Col span={14}>
            <Form.Item
              label="对象类型"
              name="type"
              rules={[{ required: true }]}
            >
              <Select
                options={Object.entries(abilityGraphNodeTypeLabels)
                  .filter(([value]) => value !== 'teaching-resource')
                  .map(([value, label]) => ({ label, value }))}
              />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item
              label="编码"
              name="code"
              rules={[{ required: true }]}
            >
              <Input placeholder="如 CO-DS-5" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item
          label="名称"
          name="name"
          rules={[{ required: true }]}
        >
          <Input placeholder="使用清晰、稳定的业务名称" />
        </Form.Item>
        <Form.Item
          label="可观察定义"
          name="definition"
          rules={[{ required: true }]}
        >
          <Input.TextArea
            placeholder="说明可观察行为、适用情境与质量标准"
            rows={3}
          />
        </Form.Item>
        {selectedNodeType === 'ability' ||
        selectedNodeType === 'skill' ? (
          <>
            <Row gutter={12}>
              <Col span={14}>
                <Form.Item
                  label="能力领域"
                  name="capabilityDomain"
                  rules={[{ required: true }]}
                >
                  <Input placeholder="如复杂工程问题分析" />
                </Form.Item>
              </Col>
              <Col span={10}>
                <Form.Item
                  label="认知层级"
                  name="capabilityLevel"
                  rules={[{ required: true }]}
                >
                  <Select
                    options={Object.entries(
                      abilityGraphCapabilityLevelLabels,
                    ).map(([value, label]) => ({ label, value }))}
                    placeholder="选择可验证的最高认知层级"
                  />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              label="可观察行为"
              name="observableBehaviors"
              rules={[
                {
                  required: true,
                  message: '至少定义一项可观察行为',
                },
              ]}
            >
              <Select
                mode="tags"
                placeholder="逐条输入行为，按回车确认"
                tokenSeparators={['；', ';']}
              />
            </Form.Item>
          </>
        ) : null}
        <Form.Item
          label="责任人"
          name="owner"
          rules={[{ required: true }]}
        >
          <Input placeholder="如数据结构课程负责人" />
        </Form.Item>
        <GraphMaterialSourceFields
          emptyDescription="当前没有可引用的证据片段。请先上传并解析材料，再返回创建图谱对象。"
          isMaterialLoading={isMaterialLoading}
          materialReferences={materialReferences}
          onNavigateToResources={onNavigateToResources}
          readyDescription="材料、版本和证据片段 ID 由“材料与资源”模块提供；教学资源节点也由该模块同步，不在此处手工创建。"
        />
      </Form>
    </Modal>
  );
}
