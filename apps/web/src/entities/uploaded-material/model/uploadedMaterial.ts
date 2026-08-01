// M3 教学资源上传 - 领域模型
// 学校上传的原始材料，经 AI 提取后转为图谱节点

export type UploadedMaterialFileType = 'pdf' | 'docx' | 'xlsx';

export type UploadedMaterialCategory =
  | '培养方案'
  | '课程大纲'
  | '实验指导书'
  | '试卷'
  | '其他';

export type UploadedMaterialStatus =
  | 'pending'
  | 'extracting'
  | 'extracted'
  | 'failed';

export interface UploadedMaterial {
  id: string;
  fileName: string;
  fileType: UploadedMaterialFileType;
  category: UploadedMaterialCategory;
  uploadTime: string;
  uploadedBy: string;
  status: UploadedMaterialStatus;
  fileSize: string;
  fileUrl: string;
  extractedNodeCount?: number;
  failureReason?: string;
}
