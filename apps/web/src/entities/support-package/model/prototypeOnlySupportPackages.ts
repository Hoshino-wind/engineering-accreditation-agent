import type {
  SupportPackage,
  SupportSourceSnapshot,
  SupportTemplateKind,
} from './supportPackage';
import { createPrototypeOnlySupportPackageSections } from './prototypeOnlySupportPackageSections';

const templateNames: Record<SupportTemplateKind, string> = {
  capstone: '毕业设计能力支撑',
  'course-teaching': '课程教学能力支撑',
  'experiment-teaching': '实验教学能力达成与持续改进',
};
const prototypeContentHashes: Record<string, string> = {
  'support-package-001':
    'sha256:f8b086b12af5a2f5b5369bad76890012af270cd0c189977eb542b67385c39f9e',
  'support-package-002':
    'sha256:6a9f64ae5a4f0ded23cf08d4aa440e5c1082c460df4a3184497943a80454795c',
  'support-package-003':
    'sha256:252a00171ada97fc20455d97d20a40fd92df7431358ec901cdb726fba7f2445d',
  'support-package-004':
    'sha256:c0b55da831676e3dc967991fc0a95a032a43405b67826349056a546655e4da0f',
  'support-package-005':
    'sha256:b6d43bf3187ef29e54cca9a0422400a84441fc7e54b433145d710ac7fa9b0194',
};

function createSources(
  courseCode: string,
  evaluationState: SupportSourceSnapshot['state'] = 'formal',
  improvementState: SupportSourceSnapshot['state'] = 'confirmed',
): SupportSourceSnapshot[] {
  return [
    {
      count: 1,
      id: `${courseCode}-graph`,
      label: '能力图谱',
      module: 'M2',
      objectId: 'graph-2026-v03',
      state: 'formal',
      version: 'v0.3',
    },
    {
      count: 8,
      id: `${courseCode}-resources`,
      label: '教学材料',
      module: 'M3',
      objectId: `${courseCode}-resource-set`,
      state: 'confirmed',
      version: 'snapshot v1.0',
    },
    {
      count: 3,
      id: `${courseCode}-diagnostics`,
      label: '诊断结果',
      module: 'M5',
      objectId: `${courseCode}-diagnostic-run`,
      state: 'confirmed',
      version: 'policy v1.0',
    },
    {
      count: 1,
      id: `${courseCode}-evaluation`,
      label: '达成度评价',
      module: 'M6',
      objectId: `${courseCode}-evaluation-run`,
      state: evaluationState,
      version: 'policy v1.2',
    },
    {
      count: 1,
      id: `${courseCode}-improvement`,
      label: '改进闭环',
      module: 'M7',
      objectId: `${courseCode}-quality-issue`,
      state: improvementState,
      version: 'closure v1.0',
    },
  ];
}

interface PackageSeed {
  approval?: SupportPackage['approval'];
  course: string;
  courseCode: string;
  displayId: string;
  evaluationState?: SupportSourceSnapshot['state'];
  id: string;
  improvementState?: SupportSourceSnapshot['state'];
  kind: SupportTemplateKind;
  status: SupportPackage['status'];
  title: string;
  version: string;
}

function createPackage(seed: PackageSeed): SupportPackage {
  const contentHash = prototypeContentHashes[seed.id];
  if (!contentHash) {
    throw new Error(`缺少试点支撑包 ${seed.id} 的内容哈希`);
  }

  return {
    approval: seed.approval,
    contentHash,
    course: seed.course,
    cycle: '2025—2026 学年',
    displayId: seed.displayId,
    id: seed.id,
    permissionCheck: 'pass',
    scope: `${seed.course}实验教学`,
    sections: createPrototypeOnlySupportPackageSections(
      seed.course,
      seed.courseCode,
    ),
    sensitiveContentCheck: 'pass',
    sourceSnapshots: createSources(
      seed.courseCode,
      seed.evaluationState,
      seed.improvementState,
    ),
    status: seed.status,
    template: {
      id: `template-${seed.kind}`,
      kind: seed.kind,
      name: templateNames[seed.kind],
      version: 'v1.3',
    },
    title: seed.title,
    updatedAt: '2026-07-28 16:40',
    version: seed.version,
  };
}

const selectedPackage = createPackage({
  course: '计算机网络',
  courseCode: 'network',
  displayId: 'SP-2026-001',
  evaluationState: 'unapproved',
  id: 'support-package-001',
  improvementState: 'open',
  kind: 'experiment-teaching',
  status: 'changes-required',
  title: '实验教学认证支撑包',
  version: 'v1.2',
});

selectedPackage.sourceSnapshots = selectedPackage.sourceSnapshots.map(
  (source) =>
    source.module === 'M6'
      ? { ...source, objectId: 'eval-2026-071' }
      : source.module === 'M7'
        ? { ...source, objectId: 'qi-2026-017' }
        : source,
);
selectedPackage.sections = selectedPackage.sections.map((section) =>
  section.id === 'attainment'
    ? {
        ...section,
        claims: section.claims.map((claim) => ({
          ...claim,
          referenceIds: ['EVAL-071', 'POLICY-12'],
        })),
        status: 'blocked' as const,
      }
    : section.id === 'improvement'
      ? {
          ...section,
          claims: section.claims.map((claim) => ({
            ...claim,
            referenceIds: [
              'QI-017',
              'CHANGE-V20',
              'REEVAL-072',
            ],
          })),
          status: 'blocked' as const,
        }
      : section,
);

export const prototypeOnlySupportPackages: SupportPackage[] = [
  selectedPackage,
  createPackage({
    course: '数据结构',
    courseCode: 'data-structure',
    displayId: 'SP-2026-002',
    id: 'support-package-002',
    kind: 'course-teaching',
    status: 'ready-for-review',
    title: '课程教学认证支撑包',
    version: 'v1.0',
  }),
  createPackage({
    approval: {
      approvedAt: '2026-07-18 10:30',
      approver: '王老师',
      snapshotHash:
        'sha256:252a00171ada97fc20455d97d20a40fd92df7431358ec901cdb726fba7f2445d',
    },
    course: '软件工程',
    courseCode: 'software-engineering',
    displayId: 'SP-2026-003',
    id: 'support-package-003',
    kind: 'capstone',
    status: 'approved',
    title: '毕业设计认证支撑包',
    version: 'v1.1',
  }),
  {
    ...createPackage({
      course: '操作系统',
      courseCode: 'operating-system',
      displayId: 'SP-2026-004',
      evaluationState: 'unapproved',
      id: 'support-package-004',
      kind: 'experiment-teaching',
      status: 'draft',
      title: '实验教学认证支撑包',
      version: 'v0.3',
    }),
    contentHash: '',
  },
  createPackage({
    approval: {
      approvedAt: '2026-06-30 14:20',
      approver: '王老师',
      snapshotHash:
        'sha256:b6d43bf3187ef29e54cca9a0422400a84441fc7e54b433145d710ac7fa9b0194',
    },
    course: '数据库原理',
    courseCode: 'database',
    displayId: 'SP-2026-005',
    id: 'support-package-005',
    kind: 'experiment-teaching',
    status: 'exported',
    title: '创新训练认证支撑包',
    version: 'v1.0',
  }),
];
