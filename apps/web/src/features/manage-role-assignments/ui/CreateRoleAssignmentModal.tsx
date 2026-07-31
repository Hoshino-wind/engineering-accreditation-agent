import {
  App,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Select,
} from 'antd';

import { governanceRoles } from '../../../entities/role-assignment';
import type { RoleAssignmentInput } from '../model/roleAssignmentInput';

interface CreateRoleAssignmentModalProps {
  onClose: () => void;
  onCreate: (values: RoleAssignmentInput) => void;
  open: boolean;
}

const roleOptions = governanceRoles.map((value) => ({
  label: value,
  value,
}));

export function CreateRoleAssignmentModal({
  onClose,
  onCreate,
  open,
}: CreateRoleAssignmentModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<RoleAssignmentInput>();

  const handleCreate = async () => {
    const values = await form.validateFields();
    onCreate(values);
    onClose();
    form.resetFields();
    message.success('授权已创建，等待用户确认');
  };

  return (
    <Modal
      okText="创建授权"
      onCancel={onClose}
      onOk={handleCreate}
      open={open}
      title="新增角色授权"
    >
      <Form form={form} layout="vertical">
        <Row gutter={12}>
          <Col span={9}>
            <Form.Item
              label="姓名"
              name="name"
              rules={[{ required: true }]}
            >
              <Input placeholder="教师姓名" />
            </Form.Item>
          </Col>
          <Col span={15}>
            <Form.Item
              label="学校账号"
              name="account"
              rules={[{ required: true, type: 'email' }]}
            >
              <Input placeholder="name@example.edu.cn" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item
          label="固定角色"
          name="role"
          rules={[{ required: true }]}
        >
          <Select options={roleOptions} />
        </Form.Item>
        <Form.Item
          label="数据范围"
          name="scope"
          rules={[{ required: true }]}
        >
          <Input placeholder="如：数据结构 · 2025 秋" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
