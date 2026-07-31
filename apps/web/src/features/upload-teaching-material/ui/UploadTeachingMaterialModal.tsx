import { InboxOutlined } from '@ant-design/icons';
import {
  App,
  Input,
  Modal,
  Select,
  Space,
  Typography,
  Upload,
} from 'antd';
import type { UploadFile } from 'antd';
import { useState } from 'react';

import { recordWorkflowEvent } from '../../../entities/workflow-event';
import { useUploadTeachingMaterial } from '../model/useUploadTeachingMaterial';

interface UploadTeachingMaterialModalProps {
  onClose: () => void;
  open: boolean;
}

const resourceTypeOptions = [
  '课程大纲',
  '实验指导书',
  '实验项目清单',
  '评分表',
  '学生报告',
  '评价结果',
  '改进记录',
].map((value) => ({ label: value, value }));

export function UploadTeachingMaterialModal({
  onClose,
  open,
}: UploadTeachingMaterialModalProps) {
  const { message } = App.useApp();
  const [course, setCourse] = useState('数据结构');
  const [resourceType, setResourceType] = useState('课程大纲');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const uploadMutation = useUploadTeachingMaterial();

  const handleClose = () => {
    setFileList([]);
    onClose();
  };

  const handleUpload = async () => {
    const files = fileList.flatMap((item) =>
      item.originFileObj ? [item.originFileObj] : [],
    );
    if (files.length === 0) {
      void message.warning('请先选择至少一个材料文件');
      return;
    }
    if (files.length !== fileList.length) {
      void message.error('有文件无法读取，请重新选择');
      return;
    }
    try {
      const uploaded = await Promise.all(
        files.map((file) =>
          uploadMutation.mutateAsync({ course, file, resourceType }),
        ),
      );
      uploaded.forEach((material) => {
        recordWorkflowEvent({
          action: '上传教学材料',
          actor: '当前用户',
          module: 'M3',
          objectId: material.id,
          status: 'pending',
          summary: `${material.fileName} · 进入本地扫描与解析流水线`,
        });
      });
      handleClose();
      void message.success(
        `已接收 ${uploaded.length} 份材料，正在本地扫描与解析`,
      );
    } catch (error) {
      void message.error(
        error instanceof Error ? error.message : '材料上传失败',
      );
    }
  };

  return (
    <Modal
      cancelText="取消"
      okButtonProps={{
        disabled: fileList.length === 0,
        loading: uploadMutation.isPending,
      }}
      okText="进入处理队列"
      onCancel={handleClose}
      onOk={handleUpload}
      open={open}
      title="上传教学材料"
    >
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <div>
          <Typography.Text strong>所属课程</Typography.Text>
          <Input
            maxLength={100}
            onChange={(event) => setCourse(event.target.value)}
            placeholder="例如：数据结构"
            style={{ marginTop: 8 }}
            value={course}
          />
        </div>
        <div>
          <Typography.Text strong>材料类型</Typography.Text>
          <Select
            onChange={setResourceType}
            options={resourceTypeOptions}
            style={{ marginTop: 8, width: '100%' }}
            value={resourceType}
          />
        </div>
        <Upload.Dragger
          accept=".pdf,.docx,.xlsx,.csv,.txt,.md,.png,.jpg,.jpeg,.webp"
          beforeUpload={() => false}
          fileList={fileList}
          maxCount={5}
          multiple
          onChange={({ fileList: nextFileList }) => setFileList(nextFileList)}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">拖入文件，或点击选择</p>
          <p className="ant-upload-hint">
            单次最多 5 份；本地扫描，图片与扫描 PDF 使用 DS OCR。
          </p>
        </Upload.Dragger>
      </Space>
    </Modal>
  );
}
