import { InboxOutlined } from '@ant-design/icons';
import { message, Select, Upload } from 'antd';
import { useState } from 'react';

import type { UploadedMaterialCategory } from '../../../entities/uploaded-material';

import './uploadDropzone.css';

const { Dragger } = Upload;

const categoryOptions: { label: string; value: UploadedMaterialCategory }[] = [
  { label: '培养方案', value: '培养方案' },
  { label: '课程大纲', value: '课程大纲' },
  { label: '实验指导书', value: '实验指导书' },
  { label: '试卷', value: '试卷' },
  { label: '其他', value: '其他' },
];

interface UploadDropzoneProps {
  onUpload?: (fileName: string, category: UploadedMaterialCategory) => void;
}

// M3 材料上传拖拽区域
// Demo 阶段模拟上传，不实际发送文件到后端
export function UploadDropzone({ onUpload }: UploadDropzoneProps) {
  const [category, setCategory] =
    useState<UploadedMaterialCategory>('课程大纲');

  return (
    <div className="upload-dropzone-wrapper">
      <div className="upload-dropzone-category">
        <span className="upload-dropzone-category-label">材料分类：</span>
        <Select
          onChange={(value) => setCategory(value)}
          options={categoryOptions}
          size="small"
          style={{ width: 140 }}
          value={category}
        />
      </div>
      <Dragger
        accept=".pdf,.docx,.xlsx"
        beforeUpload={(file) => {
          // Demo 阶段：阻止真实上传，模拟成功
          message.success(`${file.name} 上传成功，已进入待处理队列`);
          onUpload?.(file.name, category);
          return false;
        }}
        multiple
        showUploadList={false}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
        <p className="ant-upload-hint">
          支持 PDF、DOCX、XLSX 格式，单次可上传多个文件
        </p>
      </Dragger>
    </div>
  );
}
