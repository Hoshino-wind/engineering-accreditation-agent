import { InboxOutlined } from '@ant-design/icons';
import { message, Select, Upload } from 'antd';
import { useState } from 'react';

import type { UploadedMaterialCategory } from '../../../entities/uploaded-material';

import './uploadDropzone.css';

const { Dragger } = Upload;

const categoryOptions: { label: string; value: UploadedMaterialCategory }[] = [
  { label: '培养方案', value: '培养方案' as UploadedMaterialCategory },
  { label: '课程大纲', value: '课程大纲' as UploadedMaterialCategory },
  { label: '实验指导书', value: '实验指导书' as UploadedMaterialCategory },
  { label: '试卷/评分表', value: '试卷' as UploadedMaterialCategory },
  { label: '其他', value: '其他' as UploadedMaterialCategory },
];

interface UploadDropzoneProps {
  courseOptions?: { label: string; value: string }[];
  loadingCourses?: boolean;
  onUpload?: (
    file: File,
    category: UploadedMaterialCategory,
    course?: string,
  ) => Promise<void> | void;
}

export function UploadDropzone({
  courseOptions = [],
  loadingCourses = false,
  onUpload,
}: UploadDropzoneProps) {
  const [category, setCategory] = useState<UploadedMaterialCategory>(
    '课程大纲' as UploadedMaterialCategory,
  );
  const [course, setCourse] = useState<string | undefined>();

  return (
    <div className="upload-dropzone-wrapper">
      <div className="upload-dropzone-fields">
        <div className="upload-dropzone-field">
          <span className="upload-dropzone-category-label">材料分类：</span>
          <Select
            onChange={(value) => setCategory(value)}
            options={categoryOptions}
            size="small"
            style={{ width: 150 }}
            value={category}
          />
        </div>
        <div className="upload-dropzone-field">
          <span className="upload-dropzone-category-label">所属课程：</span>
          <Select
            allowClear
            loading={loadingCourses}
            onChange={(value) => setCourse(value)}
            options={courseOptions}
            placeholder="选择课程"
            size="small"
            style={{ width: 220 }}
            value={course}
          />
        </div>
      </div>
      <Dragger
        accept=".pdf,.docx,.xlsx,.txt,.md"
        beforeUpload={(file) => {
          void Promise.resolve(onUpload?.(file, category, course)).catch((error) => {
            const msg =
              error instanceof Error ? error.message : '材料上传失败，请稍后重试';
            message.error(msg);
          });
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
          支持 PDF、DOCX、XLSX、TXT、MD 格式，单次可上传多个文件
        </p>
      </Dragger>
    </div>
  );
}
