import type {
  ImprovementCase,
  ImprovementSourceModule,
} from '../../../entities/improvement-case';

export type PrototypeOnlyImprovementSource = 'M5' | 'M6' | 'manual';

export interface CreateImprovementIssueInput {
  course: string;
  owner: string;
  source: PrototypeOnlyImprovementSource;
  title: string;
}

export interface PrototypeOnlyImprovementIssue {
  course: string;
  createdAt: string;
  id: string;
  owner: string;
  source: string;
  title: string;
}

export function createPrototypeOnlyImprovementIssue(
  input: CreateImprovementIssueInput,
): PrototypeOnlyImprovementIssue {
  const id = `IMPR-LOCAL-${Date.now()}`;

  return {
    ...input,
    createdAt: new Date().toISOString(),
    id,
    title: input.title.trim(),
  };
}

export function toImprovementCase(
  issue: PrototypeOnlyImprovementIssue,
): ImprovementCase {
  const sourceModule: ImprovementSourceModule =
    issue.source === 'M5' || issue.source === 'M6'
      ? issue.source
      : 'M3';
  const dueAt = new Date(
    Date.parse(issue.createdAt) + 30 * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .slice(0, 10);

  return {
    action: {
      dueAt,
      owner: issue.owner,
      target: '待制定量化目标',
      title: '待制定改进措施',
      verificationMethod: '待制定验证方法',
    },
    baseline: 0,
    changes: [],
    course: issue.course || '软件工程',
    displayId: issue.id.replace('IMPR-LOCAL-', 'QI-LOCAL-'),
    id: issue.id,
    priority: 'medium',
    rootCause: {
      category: '待确认',
      evidence: '由用户在本地工作台创建',
      summary: '等待补充根因分析',
    },
    source: {
      evidenceHash: 'local:pending',
      label:
        issue.source === 'manual'
          ? '人工发现'
          : `${sourceModule} 来源对象`,
      module: sourceModule,
      objectId: `${issue.id}-source`,
    },
    status: 'diagnosing',
    title: issue.title,
  };
}
