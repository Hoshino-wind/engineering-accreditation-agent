import type {
  SupportPackage,
  SupportTemplateKind,
} from '../../../entities/support-package';

export interface CreateSupportPackageInput {
  course: string;
  template: SupportTemplateKind;
  title: string;
}

export interface PrototypeOnlySupportPackageRecord {
  course: string;
  createdAt: string;
  id: string;
  template: SupportTemplateKind;
  title: string;
}

const supportTemplateNames: Record<SupportTemplateKind, string> = {
  capstone: '毕业设计支撑',
  'course-teaching': '课程教学支撑',
  'experiment-teaching': '实验教学支撑',
};

export function createPrototypeOnlySupportPackageRecord(
  input: CreateSupportPackageInput,
): PrototypeOnlySupportPackageRecord {
  const id = `PKG-LOCAL-${Date.now()}`;

  return {
    ...input,
    createdAt: new Date().toISOString(),
    id,
    title: input.title.trim(),
  };
}

export function toSupportPackage(
  localPackage: PrototypeOnlySupportPackageRecord,
): SupportPackage {
  return {
    contentHash: 'local:pending',
    course: localPackage.course,
    cycle: '2025—2026 学年',
    displayId: localPackage.id.replace('PKG-LOCAL-', 'SP-LOCAL-'),
    id: localPackage.id,
    permissionCheck: 'pass',
    scope: `${localPackage.course} · 本地草稿`,
    sections: [
      {
        claims: [],
        code: '1',
        id: `${localPackage.id}-section-overview`,
        referenceCount: 0,
        status: 'blocked',
        summary: '等待选择来源快照并生成章节内容。',
        title: '支撑包概览',
      },
    ],
    sensitiveContentCheck: 'pass',
    sourceSnapshots: [],
    status: 'draft',
    template: {
      id: `template-${localPackage.template}`,
      kind: localPackage.template,
      name: supportTemplateNames[localPackage.template],
      version: 'v1.0',
    },
    title: localPackage.title,
    updatedAt: new Date(localPackage.createdAt).toLocaleString('zh-CN'),
    version: 'v0.1',
  };
}
