import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  InboxOutlined,
  ReloadOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Alert, Button, Select, Tag, Tooltip, Upload } from 'antd';
import type { UploadFile } from 'antd';
import { useState } from 'react';

import type { UploadedMaterialCategory } from '../../../entities/uploaded-material';
import {
  ClassifyError,
  classifyMaterial,
  type ClassifyResourceResponse,
} from '../../../shared/api/resourcesClient';

import './uploadDropzone.css';

const { Dragger } = Upload;

const categoryOptions: { label: string; value: UploadedMaterialCategory }[] = [
  { label: '培养方案', value: '培养方案' },
  { label: '课程大纲', value: '课程大纲' },
  { label: '实验指导书', value: '实验指导书' },
  { label: '实验项目清单', value: '实验项目清单' },
  { label: '评分表', value: '评分表' },
  { label: '学生报告', value: '学生报告' },
  { label: '评价结果', value: '评价结果' },
  { label: '其他', value: '其他' },
];

// 单个待确认文件项
interface PendingFile {
  uid: string;
  file: File;
  // 分类状态
  classifyStatus: 'pending' | 'classifying' | 'classified' | 'failed';
  predictedCategory: UploadedMaterialCategory; // AI 预填的
  confirmedCategory: UploadedMaterialCategory; // 老师可修改的最终值
  confidence?: number;
  reason?: string;
  isEvaluationEvidence?: boolean;
  model?: string;
  errorMsg?: string;
}

interface UploadDropzoneProps {
  onUpload?: (file: File, category: UploadedMaterialCategory) => void;
}

// M3 材料上传拖拽区域
// 两阶段：选文件 → AI 自动预填分类 → 老师可改 → 确认后上传
export function UploadDropzone({ onUpload }: UploadDropzoneProps) {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);

  // 选完文件 → 自动调 classify
  const handleFilesAdded = (files: File[]) => {
    const newItems: PendingFile[] = files.map((file) => ({
      uid: `${file.name}-${file.size}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 6)}`,
      file,
      classifyStatus: 'pending',
      predictedCategory: '其他',
      confirmedCategory: '其他',
    }));
    setPendingFiles((prev) => [...prev, ...newItems]);

    // 并行触发分类
    newItems.forEach((item) => {
      void classifyOne(item.uid, item.file);
    });
  };

  const classifyOne = async (uid: string, file: File) => {
    // 标记为 classifying
    setPendingFiles((prev) =>
      prev.map((p) =>
        p.uid === uid ? { ...p, classifyStatus: 'classifying' } : p,
      ),
    );

    try {
      const resp: ClassifyResourceResponse = await classifyMaterial(file);
      const predicted = (resp.category || '其他') as UploadedMaterialCategory;
      // 校验 category 在选项内
      const valid: UploadedMaterialCategory = categoryOptions.some(
        (o) => o.value === predicted,
      )
        ? predicted
        : '其他';

      setPendingFiles((prev) =>
        prev.map((p) =>
          p.uid === uid
            ? {
                ...p,
                classifyStatus: 'classified',
                predictedCategory: valid,
                confirmedCategory: valid, // 默认采用 AI 预填，老师可改
                confidence: resp.confidence,
                reason: resp.reason,
                isEvaluationEvidence: resp.isEvaluationEvidence,
                model: resp.model,
              }
            : p,
        ),
      );
    } catch (err) {
      const msg =
        err instanceof ClassifyError
          ? err.message
          : err instanceof Error
            ? err.message
            : '未知错误';
      setPendingFiles((prev) =>
        prev.map((p) =>
          p.uid === uid
            ? { ...p, classifyStatus: 'failed', errorMsg: msg }
            : p,
        ),
      );
    }
  };

  const handleConfirm = (uid: string) => {
    const item = pendingFiles.find((p) => p.uid === uid);
    if (!item) return;
    onUpload?.(item.file, item.confirmedCategory);
    setPendingFiles((prev) => prev.filter((p) => p.uid !== uid));
  };

  const handleRemove = (uid: string) => {
    setPendingFiles((prev) => prev.filter((p) => p.uid !== uid));
  };

  const handleRetryClassify = (uid: string) => {
    const item = pendingFiles.find((p) => p.uid === uid);
    if (!item) return;
    void classifyOne(uid, item.file);
  };

  const allConfirmed = pendingFiles.every(
    (p) => p.classifyStatus !== 'pending' && p.classifyStatus !== 'classifying',
  );

  // 批量确认所有 classified 文件
  const handleConfirmAll = () => {
    pendingFiles
      .filter((p) => p.classifyStatus === 'classified')
      .forEach((p) => onUpload?.(p.file, p.confirmedCategory));
    setPendingFiles([]);
  };

  return (
    <div className="upload-dropzone-wrapper">
      <Dragger
        accept=".pdf,.docx,.xlsx"
        beforeUpload={(file) => {
          handleFilesAdded([file]);
          return false;
        }}
        multiple
        showUploadList={false}
        fileList={[] as UploadFile[]}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
        <p className="ant-upload-hint">
          支持 PDF、DOCX、XLSX 格式，单次可上传多个文件 · AI 自动识别类型，老师确认后入库
        </p>
      </Dragger>

      {pendingFiles.length > 0 && (
        <div className="upload-pending-list">
          <div className="upload-pending-header">
            <span className="upload-pending-title">
              待确认文件 · {pendingFiles.length} 项
            </span>
            {allConfirmed && pendingFiles.length > 1 && (
              <Button type="primary" size="small" onClick={handleConfirmAll}>
                全部确认上传
              </Button>
            )}
          </div>

          {pendingFiles.map((item) => (
            <div key={item.uid} className="upload-pending-item">
              <div className="upload-pending-item-row1">
                <span className="upload-pending-filename" title={item.file.name}>
                  <FileTextOutlined /> {item.file.name}
                </span>
                <div className="upload-pending-actions">
                  {item.classifyStatus === 'classifying' && (
                    <Tag icon={<ClockCircleOutlined />} color="processing">
                      AI 识别中…
                    </Tag>
                  )}
                  {item.classifyStatus === 'failed' && (
                    <Tag icon={<WarningOutlined />} color="warning">
                      识别失败
                    </Tag>
                  )}
                  {item.classifyStatus === 'classified' &&
                    item.isEvaluationEvidence && (
                      <Tooltip title="评价证据类材料本轮暂不进入节点提取流水线，仅入库留档供后续迭代">
                        <Tag color="orange">评价证据</Tag>
                      </Tooltip>
                    )}
                  <Button
                    size="small"
                    type="text"
                    onClick={() => handleRemove(item.uid)}
                  >
                    移除
                  </Button>
                </div>
              </div>

              {item.classifyStatus === 'classified' && (
                <div className="upload-pending-item-row2">
                  <div className="upload-pending-classify">
                    <span className="upload-pending-label">分类：</span>
                    <Select
                      size="small"
                      value={item.confirmedCategory}
                      onChange={(v: UploadedMaterialCategory) =>
                        setPendingFiles((prev) =>
                          prev.map((p) =>
                            p.uid === item.uid
                              ? { ...p, confirmedCategory: v }
                              : p,
                          ),
                        )
                      }
                      options={categoryOptions}
                      style={{ width: 140 }}
                    />
                    {item.confirmedCategory === item.predictedCategory ? (
                      <span className="upload-pending-ai-tag">
                        <CheckCircleOutlined style={{ color: '#52c41a' }} /> AI 预填
                      </span>
                    ) : (
                      <span className="upload-pending-ai-tag modified">
                        已修改
                      </span>
                    )}
                    {item.confidence !== undefined && (
                      <span className="upload-pending-confidence">
                        置信度 {(item.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  {item.reason && (
                    <div className="upload-pending-reason" title={item.reason}>
                      依据：{item.reason}
                    </div>
                  )}
                  <div className="upload-pending-confirm">
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => handleConfirm(item.uid)}
                    >
                      确认上传
                    </Button>
                  </div>
                </div>
              )}

              {item.classifyStatus === 'failed' && (
                <div className="upload-pending-item-row2">
                  <Alert
                    type="warning"
                    showIcon
                    banner
                    message={`${item.errorMsg || '识别失败'} · 请手动选择分类后确认`}
                    action={
                      <Button
                        size="small"
                        type="link"
                        icon={<ReloadOutlined />}
                        onClick={() => handleRetryClassify(item.uid)}
                      >
                        重试
                      </Button>
                    }
                  />
                  <div className="upload-pending-classify">
                    <span className="upload-pending-label">分类：</span>
                    <Select
                      size="small"
                      value={item.confirmedCategory}
                      onChange={(v: UploadedMaterialCategory) =>
                        setPendingFiles((prev) =>
                          prev.map((p) =>
                            p.uid === item.uid
                              ? { ...p, confirmedCategory: v }
                              : p,
                          ),
                        )
                      }
                      options={categoryOptions}
                      style={{ width: 140 }}
                    />
                  </div>
                  <div className="upload-pending-confirm">
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => handleConfirm(item.uid)}
                    >
                      确认上传
                    </Button>
                  </div>
                </div>
              )}

              {item.classifyStatus === 'classifying' && (
                <div className="upload-pending-item-row2">
                  <span className="upload-pending-loading-hint">
                    AI 正在分析文件名与文本内容，预填分类…
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="upload-dropzone-tips">
        <span className="upload-dropzone-tips-label">
          <FileTextOutlined /> 上传流程
        </span>
        <span className="upload-dropzone-tips-text">
          选文件 → AI 自动识别类型（含依据，可溯源）→ 老师可修改 → 确认上传。
          评分表 / 学生报告 / 评价结果 作为评价证据，本轮仅入库留档，不参与节点提取。
        </span>
      </div>
    </div>
  );
}
