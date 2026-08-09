/**
 * 专业切换器 · 认证主体选择。
 *
 * 放在侧边栏最顶部（课程切换器上方）。专业是工程认证的主体，
 * 视觉地位高于课程切换器。下拉展示专业列表 +「添加专业」入口，
 * 每个专业项 hover 显示删除按钮（与 CourseSwitcher 一致）。
 *
 * 切换专业时调用 setSelectedMajorId，majorStore 会派发 major-changed 事件，
 * AppShell 监听后通过 refreshKey 强制子页面重新挂载并以新的 X-Major-Id 拉取数据。
 */

import {
  DownOutlined,
  MinusCircleFilled,
  PlusOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import {
  Dropdown,
  Empty,
  Form,
  Input,
  Modal,
  Spin,
  Typography,
  message,
} from 'antd';
import type { MenuProps } from 'antd';
import { useCallback, useState } from 'react';

import {
  MajorsApiError,
  createMajor,
  deleteMajor,
  type MajorResponse,
} from '../../../shared/api/majorsClient';
import { useMajorState } from '../../../shared/major/useMajorState';

import './MajorSwitcher.css';

interface MajorSwitcherProps {
  collapsed?: boolean;
}

interface CreateMajorForm {
  name: string;
  code?: string;
  schoolName?: string;
  description?: string;
}

export function MajorSwitcher({ collapsed }: MajorSwitcherProps) {
  const { major, majorList, isLoading, setMajorId, reload } = useMajorState();
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form] = Form.useForm<CreateMajorForm>();

  const displayLabel = major ? major.name : '未选择专业';
  const displaySchool = major?.schoolName ?? '';

  const handleCreate = useCallback(
    async (values: CreateMajorForm) => {
      setCreating(true);
      try {
        const created = await createMajor({
          name: values.name,
          code: values.code?.trim() || undefined,
          schoolName: values.schoolName?.trim() || undefined,
          description: values.description?.trim() || undefined,
        });
        await reload();
        setMajorId(created.id);
        setCreateOpen(false);
        form.resetFields();
        message.success(`已添加专业「${created.name}」`);
      } catch (err) {
        const msg = err instanceof MajorsApiError ? err.message : '添加失败，请重试';
        message.error(msg);
      } finally {
        setCreating(false);
      }
    },
    [form, reload, setMajorId],
  );

  const handleDelete = useCallback(
    async (target: MajorResponse) => {
      setDeletingId(target.id);
      try {
        await deleteMajor(target.id);
        // reload 会自动校正选中状态：若删的正是当前专业，会自动切到剩余第一个
        await reload();
        message.success(`已删除专业「${target.name}」`);
      } catch (err) {
        const msg = err instanceof MajorsApiError ? err.message : '删除失败，请重试';
        message.error(msg);
      } finally {
        setDeletingId(null);
      }
    },
    [reload],
  );

  const menuItems: MenuProps['items'] = [
    ...(majorList.length > 0
      ? majorList.map((m) => ({
          key: m.id,
          icon: <SafetyCertificateOutlined />,
          label: (
            <div className="major-switcher-menu-item major-switcher-menu-item--manageable">
              <div className="major-switcher-menu-primary">
                <div className="major-switcher-menu-texts">
                  <span className="major-switcher-menu-name">{m.name}</span>
                  {m.schoolName && (
                    <span className="major-switcher-menu-school">
                      {m.schoolName}
                    </span>
                  )}
                </div>
                {m.code && (
                  <span className="major-switcher-menu-code">{m.code}</span>
                )}
              </div>
              <button
                type="button"
                className="major-switcher-menu-delete"
                title={`删除专业「${m.name}」`}
                disabled={deletingId === m.id}
                onClick={(e) => {
                  e.stopPropagation();
                  Modal.confirm({
                    title: '删除专业',
                    content: `确认删除「${m.name}」？删除后，该专业下的课程、图谱等数据将不再属于当前认证范围。`,
                    okText: '删除',
                    cancelText: '取消',
                    okButtonProps: { danger: true },
                    onOk: () => handleDelete(m),
                  });
                }}
              >
                <MinusCircleFilled />
              </button>
            </div>
          ),
          onClick: () => setMajorId(m.id),
        }))
      : isLoading
        ? []
        : [
            {
              key: 'empty',
              disabled: true,
              label: (
                <div className="major-switcher-empty-block">
                  <Empty
                    description={
                      <span>
                        暂无专业，
                        <br />
                        请先添加认证专业
                      </span>
                    }
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                </div>
              ),
            },
          ]),
    { type: 'divider' },
    {
      key: 'create',
      icon: <PlusOutlined style={{ color: '#3b5bdb' }} />,
      label: (
        <span className="major-switcher-menu-create" style={{ color: '#3b5bdb' }}>
          添加专业
        </span>
      ),
      onClick: () => {
        form.resetFields();
        setCreateOpen(true);
      },
    },
  ];

  const createModal = (
    <Modal
      title="添加认证专业"
      open={createOpen}
      onCancel={() => setCreateOpen(false)}
      okText="添加"
      cancelText="取消"
      confirmLoading={creating}
      onOk={() => form.submit()}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleCreate}
        autoComplete="off"
      >
        <Form.Item
          label="专业名称"
          name="name"
          rules={[{ required: true, message: '请输入专业名称' }, { max: 100 }]}
        >
          <Input placeholder="例如：计算机科学与技术" maxLength={100} showCount />
        </Form.Item>
        <Form.Item label="专业代码" name="code" rules={[{ max: 50 }]}>
          <Input placeholder="选填，如 080901" maxLength={50} />
        </Form.Item>
        <Form.Item label="学校名称" name="schoolName" rules={[{ max: 100 }]}>
          <Input placeholder="选填，如 示例大学" maxLength={100} />
        </Form.Item>
        <Form.Item label="专业简介" name="description" rules={[{ max: 500 }]}>
          <Input.TextArea rows={3} maxLength={500} showCount placeholder="选填" />
        </Form.Item>
      </Form>
    </Modal>
  );

  if (collapsed) {
    return (
      <div>
        <Dropdown
          menu={{ items: menuItems }}
          trigger={['click']}
          placement="right"
        >
          <div className="major-switcher-collapsed">
            <SafetyCertificateOutlined />
          </div>
        </Dropdown>
        {createModal}
      </div>
    );
  }

  return (
    <div className="major-switcher-wrapper">
      <Dropdown
        menu={{ items: menuItems }}
        trigger={['click']}
        placement="bottomLeft"
      >
        <div className="major-switcher-trigger">
          <div className="major-switcher-icon">
            <SafetyCertificateOutlined />
          </div>
          <div className="major-switcher-content">
            {isLoading ? (
              <Spin size="small" />
            ) : (
              <>
                <Typography.Text className="major-switcher-label">
                  认证专业
                </Typography.Text>
                <Typography.Text className="major-switcher-name" strong>
                  {displayLabel}
                </Typography.Text>
                {displaySchool && (
                  <Typography.Text className="major-switcher-school">
                    {displaySchool}
                  </Typography.Text>
                )}
              </>
            )}
          </div>
          <DownOutlined className="major-switcher-arrow" />
        </div>
      </Dropdown>
      {createModal}
    </div>
  );
}
