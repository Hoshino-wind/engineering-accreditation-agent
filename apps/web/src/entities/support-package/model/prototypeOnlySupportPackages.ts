import type {
  SupportPackage,
  SupportPackageSection,
  SupportSourceSnapshot,
  SupportTemplateKind,
} from './supportPackage';

const templateNames: Record<SupportTemplateKind, string> = {
  capstone: '毕业设计能力支撑',
  'course-teaching': '课程教学能力支撑',
  'experiment-teaching': '实验教学能力达成与持续改进',
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

function createSections(course: string): SupportPackageSection[] {
  return [
    {
      claims: [
        {
          id: 'claim-graph-path',
          referenceIds: ['G-GR05', 'G-GR03', 'E-RS18'],
          text: `${course}已形成从毕业要求指标点（GR-01/GR-03/GR-05）到课程目标、实验项目（如系统设计 EXP-EMB-01、LED流水灯 EXP-FPGA-01）和评分项的正式支撑路径。`,
        },
      ],
      code: '1',
      id: 'ability-graph',
      referenceCount: 12,
      status: 'ready',
      summary:
        '本章节基于能力图谱正式版本和课程目标，说明实验教学各环节与毕业要求指标点的对应关系。',
      title: '能力图谱与课程目标',
    },
    {
      claims: [
        {
          id: 'claim-resource-consistency',
          referenceIds: ['RS-18', 'DF-013'],
          text: '教学大纲、实验指导书和评分规则的关键名称与目标已经完成一致性核验。',
        },
      ],
      code: '2',
      id: 'resources',
      referenceCount: 8,
      status: 'ready',
      summary:
        '本章节固定教学材料版本，并汇总材料一致性诊断及处理结论。',
      title: '教学资源与一致性',
    },
    {
      claims: [
        {
          id: 'claim-attainment',
          referenceIds: ['EVAL-071', 'POLICY-12'],
          text: '达成度结果使用固定策略、输入快照和程序版本进行确定性计算。',
        },
      ],
      code: '3',
      id: 'attainment',
      referenceCount: 4,
      status: 'ready',
      summary:
        '本章节说明评价范围、确定性计算口径、达成结果和未达标项。',
      title: '达成度评价与分析',
    },
    {
      claims: [
        {
          id: 'claim-improvement',
          referenceIds: ['QI-017', 'CHANGE-V20', 'REEVAL-071'],
          text: '教学改进已经落实为实际对象新版本，并通过后续评价记录效果。',
        },
      ],
      code: '4',
      id: 'improvement',
      referenceCount: 6,
      status: 'ready',
      summary:
        '本章节汇总问题来源、原因、措施、实际教学变更、图谱更新和复评结论。',
      title: '持续改进闭环',
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
  const contentHash = `sha256:${seed.id.slice(-3)}7…b921`;

  return {
    approval: seed.approval,
    contentHash,
    course: seed.course,
    cycle: '2025—2026 学年',
    displayId: seed.displayId,
    id: seed.id,
    permissionCheck: 'pass',
    scope: `${seed.course}实验教学`,
    sections: createSections(seed.course),
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
  course: '单片机基础',
  courseCode: 'co-mcu',
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
  ['attainment', 'improvement'].includes(section.id)
    ? { ...section, status: 'blocked' as const }
    : section,
);

export const prototypeOnlySupportPackages: SupportPackage[] = [
  selectedPackage,
  createPackage({
    course: '数据结构与算法',
    courseCode: 'co-ds',
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
      snapshotHash: 'sha256:0037…b921',
    },
    course: '嵌入式系统原理',
    courseCode: 'co-fpga',
    displayId: 'SP-2026-003',
    id: 'support-package-003',
    kind: 'capstone',
    status: 'approved',
    title: '毕业设计认证支撑包',
    version: 'v1.1',
  }),
  {
    ...createPackage({
      course: '单片机基础',
      courseCode: 'co-mcu',
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
      snapshotHash: 'sha256:0057…b921',
    },
    course: '嵌入式系统原理',
    courseCode: 'co-fpga',
    displayId: 'SP-2026-005',
    id: 'support-package-005',
    kind: 'experiment-teaching',
    status: 'exported',
    title: '创新训练认证支撑包',
    version: 'v1.0',
  }),
];
