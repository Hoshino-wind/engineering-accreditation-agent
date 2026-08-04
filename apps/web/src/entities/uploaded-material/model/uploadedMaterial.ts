export type UploadedMaterialFileType = 'pdf' | 'docx' | 'xlsx' | 'txt';

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
  course?: string;
  uploadTime: string;
  uploadedBy: string;
  status: UploadedMaterialStatus;
  fileSize: string;
  fileUrl: string;
  extractedNodeCount?: number;
  failureReason?: string;
  parserVersion?: string;
  parseStrategy?: string;
}
