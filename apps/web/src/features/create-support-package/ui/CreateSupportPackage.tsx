import { FileAddOutlined } from '@ant-design/icons';
import { useState } from 'react';
import {
  App,
  Button,
  Input,
  Modal,
  Select,
  Space,
  Typography,
} from 'antd';

import type { SupportTemplateKind } from '../../../entities/support-package';
import type { CreateSupportPackageInput } from '../model/prototypeOnlySupportPackage';

const courseOptions = [
  { label: '软件工程', value: '软件工程' },
  { label: '数据结构', value: '数据结构' },
  { label: '计算机组成原理', value: '计算机组成原理' },
];

const templateOptions: Array<{
  label: string;
  value: SupportTemplateKind;
}> = [
  { label: '课程教学支撑', value: 'course-teaching' },
  { label: '实验教学支撑', value: 'experiment-teaching' },
  { label: '毕业设计支撑', value: 'capstone' },
];

interface CreateSupportPackageProps {
  onCreate: (input: CreateSupportPackageInput) => void;
}

export function CreateSupportPackage({
  onCreate,
}: CreateSupportPackageProps) {
  const { message } = App.useApp();
  const [createOpen, setCreateOpen] = useState(false);
  const [packageTitle, setPackageTitle] = useState('');
  const [course, setCourse] = useState('软件工程');
  const [template, setTemplate] =
    useState<SupportTemplateKind>('course-teaching');

  const handleCreate = () => {
    if (!packageTitle.trim()) {
      void message.warning('请填写支撑包名称');
      return;
    }

    onCreate({
      course,
      template,
      title: packageTitle.trim(),
    });
    setPackageTitle('');
    setCreateOpen(false);
    void message.success('支撑包草稿已创建，并写入审计轨迹');
  };

  return (
    <>
      <Button
        icon={<FileAddOutlined />}
        onClick={() => setCreateOpen(true)}
        type="primary"
      >
        新建支撑包
      </Button>
      <Modal
        cancelText="取消"
        okButtonProps={{ disabled: !packageTitle.trim() }}
        okText="创建草稿"
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        open={createOpen}
        title="新建认证支撑包"
      >
        <Space orientation="vertical" size={14} style={{ width: '100%' }}>
          <div>
            <Typography.Text strong>支撑包名称</Typography.Text>
            <Input
              maxLength={100}
              onChange={(event) => setPackageTitle(event.target.value)}
              placeholder="例如：2026 届软件工程课程认证支撑包"
              showCount
              style={{ marginTop: 8 }}
              value={packageTitle}
            />
          </div>
          <div>
            <Typography.Text strong>适用课程</Typography.Text>
            <Select
              onChange={setCourse}
              options={courseOptions}
              style={{ marginTop: 8, width: '100%' }}
              value={course}
            />
          </div>
          <div>
            <Typography.Text strong>模板</Typography.Text>
            <Select
              onChange={setTemplate}
              options={templateOptions}
              style={{ marginTop: 8, width: '100%' }}
              value={template}
            />
          </div>
        </Space>
      </Modal>
    </>
  );
}
