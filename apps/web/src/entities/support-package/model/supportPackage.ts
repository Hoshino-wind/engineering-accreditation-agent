export type SupportPackageStatus =
  | 'draft'
  | 'changes-required'
  | 'ready-for-review'
  | 'approved'
  | 'exported';

export type SupportTemplateKind =
  | 'experiment-teaching'
  | 'course-teaching'
  | 'capstone';

export type SupportSourceModule = 'M2' | 'M3' | 'M5' | 'M6' | 'M7';

export type SupportSourceState =
  | 'formal'
  | 'confirmed'
  | 'unapproved'
  | 'open';

export interface SupportTemplateRef {
  id: string;
  kind: SupportTemplateKind;
  name: string;
  version: string;
}

export interface SupportSourceSnapshot {
  count: number;
  id: string;
  label: string;
  module: SupportSourceModule;
  objectId: string;
  state: SupportSourceState;
  version: string;
}

export interface SupportClaim {
  id: string;
  referenceIds: string[];
  text: string;
}

export interface SupportPackageSection {
  claims: SupportClaim[];
  code: string;
  id: string;
  referenceCount: number;
  status: 'ready' | 'blocked';
  summary: string;
  title: string;
}

export interface SupportPackageApproval {
  approvedAt: string;
  approver: string;
  snapshotHash: string;
}

export interface SupportPackage {
  approval?: SupportPackageApproval;
  contentHash: string;
  course: string;
  cycle: string;
  displayId: string;
  id: string;
  permissionCheck: 'pass' | 'blocked';
  scope: string;
  sections: SupportPackageSection[];
  sensitiveContentCheck: 'pass' | 'blocked';
  sourceSnapshots: SupportSourceSnapshot[];
  status: SupportPackageStatus;
  template: SupportTemplateRef;
  title: string;
  updatedAt: string;
  version: string;
}

export type SupportExportFormat = 'pdf' | 'docx' | 'evidence-archive';
