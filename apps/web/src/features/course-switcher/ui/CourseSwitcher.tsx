/**
 * 课程范围筛选器 + 课程管理入口。
 *
 * 放在侧边栏顶部（logo 下方）。默认显示「全部课程 · 专业全局」，
 * 即专业层面的完整视图。选择某门课程后，各模块页面钻取到该课程细节。
 * 课程体系由用户自建：下拉底部固定「添加课程」入口，
 * 每个课程项 hover 显示删除按钮。
 */

import {
  BookOutlined,
  DownOutlined,
  GlobalOutlined,
  MinusCircleFilled,
  PlusOutlined,
} from '@ant-design/icons';
import { Dropdown, Empty, Form, Input, InputNumber, Modal, Spin, Typography, message } from 'antd';
import type { MenuProps } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  CoursesApiError,
  createCourse,
  deleteCourse,
  fetchCourses,
  type CourseResponse,
} from '../../../shared/api/coursesClient';
import {
  ALL_COURSES,
  emitCourseListChanged,
  getSelectedCourseId,
  setSelectedCourseId,
  subscribeCourseChange,
  subscribeCourseListChanged,
  type SelectedCourseId,
} from '../../../shared/course/courseStore';

import './courseSwitcher.css';

interface CourseSwitcherProps {
  collapsed?: boolean;
}

interface CreateCourseForm {
  name: string;
  code?: string;
  credits?: number | null;
  semester?: string;
  description?: string;
}

export function CourseSwitcher({ collapsed }: CourseSwitcherProps) {
  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedIdState] = useState<SelectedCourseId>(getSelectedCourseId());
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form] = Form.useForm<CreateCourseForm>();

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCourses();
      if (data) setCourses(data);
    } finally {
      setLoading(false);
    }
  }, []);

  // 首次加载课程列表
  useEffect(() => {
    void reload();
  }, [reload]);

  // 订阅课程变化（其他组件也可能调用 setSelectedCourseId）
  useEffect(() => {
    const unsub = subscribeCourseChange((id) => setSelectedIdState(id));
    return unsub;
  }, []);

  // 订阅课程列表变化事件，收到事件时重新加载课程列表
  useEffect(() => {
    const unsub = subscribeCourseListChanged(() => {
      void reload();
    });
    return unsub;
  }, [reload]);

  // 兼容：localStorage 里可能存历史课程名或旧 id，在当前列表找不到就降级为全部课程
  const selectedCourse = useMemo(() => {
    if (selectedId === ALL_COURSES) return null;
    return (
      courses.find((c) => c.id === selectedId) ??
        courses.find((c) => c.name === selectedId) ??
        null
    );
  }, [selectedId, courses]);

  const displayLabel = selectedCourse ? selectedCourse.name : '全部课程 · 专业全局';
  const displayIcon = selectedCourse ? <BookOutlined /> : <GlobalOutlined />;

  const handleCreate = useCallback(
    async (values: CreateCourseForm) => {
      setCreating(true);
      try {
        const created = await createCourse({
          name: values.name,
          code: values.code?.trim() || null,
          credits: values.credits ?? null,
          semester: values.semester?.trim() || null,
          description: values.description?.trim() || null,
        });
        setCourses((prev) => [...prev, created]);
        setSelectedCourseId(created.id);
        setCreateOpen(false);
        form.resetFields();
        emitCourseListChanged();
        message.success(`已添加课程「${created.name}」`);
      } catch (err) {
        const msg = err instanceof CoursesApiError ? err.message : '添加失败，请重试';
        message.error(msg);
      } finally {
        setCreating(false);
      }
    },
    [form],
  );

  const handleDelete = useCallback(
    async (course: CourseResponse) => {
      setDeletingId(course.id);
      try {
        await deleteCourse(course.id);
        setCourses((prev) => prev.filter((c) => c.id !== course.id));
        if (selectedId === course.id) {
          setSelectedCourseId(ALL_COURSES);
        }
        emitCourseListChanged();
        message.success(`已删除课程「${course.name}」`);
      } catch (err) {
        const msg = err instanceof CoursesApiError ? err.message : '删除失败，请重试';
        message.error(msg);
      } finally {
        setDeletingId(null);
      }
    },
    [selectedId],
  );

  const menuItems: MenuProps['items'] = [
    {
      key: 'all',
      icon: <GlobalOutlined />,
      label: (
        <div className="course-switcher-menu-item">
          <span className="course-switcher-menu-name">全部课程</span>
          <span className="course-switcher-menu-hint">专业全局视角</span>
        </div>
      ),
      onClick: () => setSelectedCourseId(ALL_COURSES),
    },
    { type: 'divider' },
    ...(courses.length > 0
      ? courses.map((c) => ({
          key: c.id,
          icon: <BookOutlined />,
          label: (
            <div className="course-switcher-menu-item course-switcher-menu-item--manageable">
              <div className="course-switcher-menu-primary">
                <span className="course-switcher-menu-name">{c.name}</span>
                {c.code && (
                  <span className="course-switcher-menu-code">{c.code}</span>
                )}
              </div>
              <button
                type="button"
                className="course-switcher-menu-delete"
                title={`删除课程「${c.name}」`}
                disabled={deletingId === c.id}
                onClick={(e) => {
                  e.stopPropagation();
                  Modal.confirm({
                    title: '删除课程',
                    content: `确认删除「${c.name}」？删除后，该课程关联的切换状态会回到专业全局视图。`,
                    okText: '删除',
                    cancelText: '取消',
                    okButtonProps: { danger: true },
                    onOk: () => handleDelete(c),
                  });
                }}
              >
                <MinusCircleFilled />
              </button>
            </div>
          ),
          onClick: () => setSelectedCourseId(c.id),
        }))
      : loading
        ? []
        : [
            {
              key: 'empty',
              disabled: true,
              label: (
                <div className="course-switcher-empty-block">
                  <Empty
                    description={
                      <span>
                        暂无课程，
                        <br />
                        先添加你所在专业的课程体系
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
        <span className="course-switcher-menu-create" style={{ color: '#3b5bdb' }}>
          添加课程
        </span>
      ),
      onClick: () => {
        form.resetFields();
        setCreateOpen(true);
      },
    },
  ];

  if (collapsed) {
    return (
      <div>
        <Dropdown
          menu={{ items: menuItems }}
          trigger={['click']}
          placement="right"
        >
          <div className="course-switcher-collapsed">
            {displayIcon}
          </div>
        </Dropdown>
        <Modal
          title="添加课程"
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
              label="课程名称"
              name="name"
              rules={[{ required: true, message: '请输入课程名称' }, { max: 100 }]}
            >
              <Input placeholder="例如：数据结构与算法" maxLength={100} showCount />
            </Form.Item>
            <Form.Item label="课程代码" name="code" rules={[{ max: 50 }]}>
              <Input placeholder="选填，如 B020012005" maxLength={50} />
            </Form.Item>
            <Form.Item label="学分" name="credits" rules={[{ min: 0 }]}>
              <InputNumber min={0} step={0.5} style={{ width: '100%' }} placeholder="选填" />
            </Form.Item>
            <Form.Item label="开课学期" name="semester" rules={[{ max: 50 }]}>
              <Input placeholder="选填，如 2025春" maxLength={50} />
            </Form.Item>
            <Form.Item label="课程简介" name="description" rules={[{ max: 500 }]}>
              <Input.TextArea rows={3} maxLength={500} showCount placeholder="选填" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    );
  }

  return (
    <div className="course-switcher-wrapper">
      <Dropdown
        menu={{ items: menuItems }}
        trigger={['click']}
        placement="bottomLeft"
      >
        <div className="course-switcher-trigger">
          <div className="course-switcher-icon">{displayIcon}</div>
          <div className="course-switcher-content">
            {loading ? (
              <Spin size="small" />
            ) : (
              <>
                <Typography.Text className="course-switcher-label" type="secondary">
                  课程范围（放大镜）
                </Typography.Text>
                <Typography.Text className="course-switcher-name" strong>
                  {displayLabel}
                </Typography.Text>
              </>
            )}
          </div>
          <DownOutlined className="course-switcher-arrow" />
        </div>
      </Dropdown>
      <button
        type="button"
        className="course-switcher-add-btn"
        onClick={() => {
          form.resetFields();
          setCreateOpen(true);
        }}
      >
        <PlusOutlined />
        <span>添加课程</span>
      </button>
      <Modal
        title="添加课程到专业课程体系"
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
            label="课程名称"
            name="name"
            rules={[{ required: true, message: '请输入课程名称' }, { max: 100 }]}
          >
            <Input placeholder="例如：数据结构与算法" maxLength={100} showCount />
          </Form.Item>
          <Form.Item label="课程代码" name="code" rules={[{ max: 50 }]}>
            <Input placeholder="选填，如 B020012005" maxLength={50} />
          </Form.Item>
          <Form.Item label="学分" name="credits" rules={[{ min: 0 }]}>
            <InputNumber min={0} step={0.5} style={{ width: '100%' }} placeholder="选填" />
          </Form.Item>
          <Form.Item label="开课学期" name="semester" rules={[{ max: 50 }]}>
            <Input placeholder="选填，如 2025春" maxLength={50} />
          </Form.Item>
          <Form.Item label="课程简介" name="description" rules={[{ max: 500 }]}>
            <Input.TextArea rows={3} maxLength={500} showCount placeholder="选填" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
