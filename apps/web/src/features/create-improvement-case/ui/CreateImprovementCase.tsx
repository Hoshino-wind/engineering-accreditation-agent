import { PlusCircleOutlined } from '@ant-design/icons';
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

import type {
  CreateImprovementIssueInput,
  PrototypeOnlyImprovementSource,
} from '../model/prototypeOnlyImprovementIssue';

const sourceOptions: Array<{
  label: string;
  value: PrototypeOnlyImprovementSource;
}> = [
  { label: 'M5 图谱诊断', value: 'M5' },
  { label: 'M6 达成度评价', value: 'M6' },
  { label: '人工发现', value: 'manual' },
];

const courseOptions = [
  { label: '软件工程', value: '软件工程' },
  { label: '数据结构', value: '数据结构' },
  { label: '计算机网络', value: '计算机网络' },
];

const ownerOptions = [
  { label: '课程负责人', value: '课程负责人' },
  { label: '专业负责人', value: '专业负责人' },
  { label: '实验中心', value: '实验中心' },
];

interface CreateImprovementCaseProps {
  onCreate: (input: CreateImprovementIssueInput) => void;
}

export function CreateImprovementCase({
  onCreate,
}: CreateImprovementCaseProps) {
  const { message } = App.useApp();
  const [createOpen, setCreateOpen] = useState(false);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueSource, setIssueSource] =
    useState<PrototypeOnlyImprovementSource>('M5');
  const [issueOwner, setIssueOwner] = useState('课程负责人');
  const [issueCourse, setIssueCourse] = useState('软件工程');

  const handleCreate = () => {
    if (!issueTitle.trim()) {
      void message.warning('请填写改进问题标题');
      return;
    }

    onCreate({
      course: issueCourse,
      owner: issueOwner,
      source: issueSource,
      title: issueTitle.trim(),
    });
    setIssueTitle('');
    setCreateOpen(false);
    void message.success('改进问题已创建，并写入审计轨迹');
  };

  return (
    <>
      <Button
        icon={<PlusCircleOutlined />}
        onClick={() => setCreateOpen(true)}
        type="primary"
      >
        新建改进问题
      </Button>
      <Modal
        cancelText="取消"
        okButtonProps={{ disabled: !issueTitle.trim() }}
        okText="创建问题"
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        open={createOpen}
        title="新建改进问题"
      >
        <Space orientation="vertical" size={14} style={{ width: '100%' }}>
          <div>
            <Typography.Text strong>问题标题</Typography.Text>
            <Input
              maxLength={100}
              onChange={(event) => setIssueTitle(event.target.value)}
              placeholder="例如：课程目标 3 的实验证据覆盖不足"
              showCount
              style={{ marginTop: 8 }}
              value={issueTitle}
            />
          </div>
          <div>
            <Typography.Text strong>问题来源</Typography.Text>
            <Select
              onChange={setIssueSource}
              options={sourceOptions}
              style={{ marginTop: 8, width: '100%' }}
              value={issueSource}
            />
          </div>
          <div>
            <Typography.Text strong>适用课程</Typography.Text>
            <Select
              onChange={setIssueCourse}
              options={courseOptions}
              style={{ marginTop: 8, width: '100%' }}
              value={issueCourse}
            />
          </div>
          <div>
            <Typography.Text strong>责任角色</Typography.Text>
            <Select
              onChange={setIssueOwner}
              options={ownerOptions}
              style={{ marginTop: 8, width: '100%' }}
              value={issueOwner}
            />
          </div>
        </Space>
      </Modal>
    </>
  );
}
