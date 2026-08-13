// M3 教学资源上传 - 领域模型
// 学校上传的原始材料，经 AI 提取后转为图谱节点

export type UploadedMaterialFileType =
  | 'pdf'
  | 'docx'
  | 'xlsx'
  | 'txt'
  | 'md'
  | 'csv'
  | 'json';

export type UploadedMaterialCategory =
  | '培养方案'
  | '课程大纲'
  | '实验指导书'
  | '实验项目清单'
  | '评分表'
  | '学生报告'
  | '评价结果'
  | '试卷'
  | '其他';

export type UploadedMaterialStatus =
  | 'pending'
  | 'extracting'
  | 'extracted'
  | 'failed';

/** AI 从材料中识别出的候选课程（老师可修改名称后确认） */
export interface SuggestedCourseInfo {
  name: string;
  code: string;
  credits?: number | null;
  description?: string | null;
  confidence: number;
  sourceExcerpt?: string | null;
}

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
  version: string;
  versionGroupId: string;
  supersedesId?: string | null;
  isCurrentVersion: boolean;
  extractedNodeCount?: number;
  failureReason?: string;
  /** 材料归属的课程名（裸传时为「未分类」，确认候选课程后回写） */
  course?: string;
  /** AI 识别出的候选课程；确认后置空 */
  suggestedCourse?: SuggestedCourseInfo | null;
}
