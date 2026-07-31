export type TeachingResourceStatus =
  | 'ready'
  | 'processing'
  | 'awaitingClassification'
  | 'failed'
  | 'quarantined';

export type TeachingResourceType =
  | '课程大纲'
  | '实验指导书'
  | '实验项目清单'
  | '评分表'
  | '学生报告'
  | '评价结果'
  | '改进记录';

export type TeachingResourceSensitivity = 'internal' | 'restricted';

export type ProcessingStageStatus = 'finish' | 'process' | 'wait' | 'error';

export interface EvidenceFragment {
  coordinate: string;
  hash: string;
  id: string;
  preview: string;
  type: '段落' | '表格' | '扫描页';
}

export interface ProcessingStage {
  detail: string;
  label: string;
  status: ProcessingStageStatus;
}

export interface TeachingResource {
  course: string;
  evidenceFragments: EvidenceFragment[];
  fileName: string;
  format:
    | 'PDF'
    | 'DOCX'
    | 'XLSX'
    | 'TXT'
    | 'CSV'
    | 'MD'
    | 'PNG'
    | 'JPG'
    | 'JPEG'
    | 'WEBP';
  hash: string;
  id: string;
  name: string;
  nextAction: string;
  owner: string;
  pageCount?: number;
  processingStages: ProcessingStage[];
  resourceType: TeachingResourceType;
  sensitivity: TeachingResourceSensitivity;
  size: string;
  sourceCoverage: number;
  status: TeachingResourceStatus;
  updatedAt: string;
  version: string;
  versionId: string;
  failureReason?: string;
}
