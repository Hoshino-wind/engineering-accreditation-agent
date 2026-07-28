import type { SupportPackage } from '../../../entities/support-package';

export type SupportValidationCheckId =
  | 'scope'
  | 'graph'
  | 'references'
  | 'permission'
  | 'sensitive-content'
  | 'content-hash'
  | 'evaluation'
  | 'improvement';

export interface SupportValidationCheck {
  detail: string;
  id: SupportValidationCheckId;
  label: string;
  ownerModule?: 'M2' | 'M3' | 'M5' | 'M6' | 'M7';
  status: 'pass' | 'blocked';
}

export interface SupportPackageValidation {
  blockedCount: number;
  canExport: boolean;
  canSubmitForReview: boolean;
  checks: SupportValidationCheck[];
  passedCount: number;
  requiresNewVersion: boolean;
}

export function validateSupportPackage(
  supportPackage: SupportPackage,
): SupportPackageValidation {
  const graphSnapshot = supportPackage.sourceSnapshots.find(
    (source) => source.module === 'M2',
  );
  const evaluationSnapshot = supportPackage.sourceSnapshots.find(
    (source) => source.module === 'M6',
  );
  const improvementSnapshot = supportPackage.sourceSnapshots.find(
    (source) => source.module === 'M7',
  );
  const referencesComplete = supportPackage.sections.every(
    (section) =>
      section.claims.length > 0 &&
      section.claims.every((claim) => claim.referenceIds.length > 0),
  );
  const scopeFrozen = Boolean(
    supportPackage.scope &&
      supportPackage.template.id &&
      supportPackage.template.version &&
      supportPackage.sourceSnapshots.every((source) => source.version),
  );
  const checks: SupportValidationCheck[] = [
    {
      detail: scopeFrozen
        ? `${supportPackage.template.version} · ${supportPackage.scope}`
        : '模板、范围或来源版本不完整',
      id: 'scope',
      label: '模板与范围已固定',
      status: scopeFrozen ? 'pass' : 'blocked',
    },
    {
      detail:
        graphSnapshot?.state === 'formal'
          ? `${graphSnapshot.objectId} ${graphSnapshot.version}`
          : '图谱版本尚未发布',
      id: 'graph',
      label: '图谱版本已发布',
      ownerModule: 'M2',
      status: graphSnapshot?.state === 'formal' ? 'pass' : 'blocked',
    },
    {
      detail: referencesComplete
        ? '所有正式结论均具备来源引用'
        : '存在无来源的正式结论',
      id: 'references',
      label: '正式结论引用完整',
      status: referencesComplete ? 'pass' : 'blocked',
    },
    {
      detail:
        supportPackage.permissionCheck === 'pass'
          ? '专业与课程范围校验通过'
          : '当前操作者无权读取全部来源',
      id: 'permission',
      label: '权限范围校验通过',
      status: supportPackage.permissionCheck,
    },
    {
      detail:
        supportPackage.sensitiveContentCheck === 'pass'
          ? '未发现超范围敏感内容'
          : '检测到未经授权的敏感内容',
      id: 'sensitive-content',
      label: '敏感内容扫描通过',
      ownerModule: 'M3',
      status: supportPackage.sensitiveContentCheck,
    },
    {
      detail: supportPackage.contentHash || '尚未生成内容哈希',
      id: 'content-hash',
      label: '内容哈希已生成',
      status: supportPackage.contentHash ? 'pass' : 'blocked',
    },
    {
      detail:
        evaluationSnapshot?.state === 'formal'
          ? evaluationSnapshot.objectId
          : '评价运行尚未批准',
      id: 'evaluation',
      label:
        evaluationSnapshot?.state === 'formal'
          ? '评价运行已经批准'
          : '评价运行尚未批准',
      ownerModule: 'M6',
      status:
        evaluationSnapshot?.state === 'formal' ? 'pass' : 'blocked',
    },
    {
      detail:
        improvementSnapshot?.state === 'confirmed'
          ? improvementSnapshot.objectId
          : '改进问题尚未关闭',
      id: 'improvement',
      label:
        improvementSnapshot?.state === 'confirmed'
          ? '改进问题已经闭环'
          : '改进问题尚未关闭',
      ownerModule: 'M7',
      status:
        improvementSnapshot?.state === 'confirmed'
          ? 'pass'
          : 'blocked',
    },
  ];
  const blockedCount = checks.filter(
    (check) => check.status === 'blocked',
  ).length;
  const requiresNewVersion = Boolean(
    supportPackage.approval &&
      supportPackage.approval.snapshotHash !== supportPackage.contentHash,
  );
  const approvalMatches = Boolean(
    supportPackage.approval &&
      supportPackage.approval.snapshotHash === supportPackage.contentHash,
  );

  return {
    blockedCount,
    canExport:
      blockedCount === 0 &&
      approvalMatches &&
      !requiresNewVersion &&
      ['approved', 'exported'].includes(supportPackage.status),
    canSubmitForReview:
      blockedCount === 0 &&
      ['draft', 'changes-required'].includes(supportPackage.status),
    checks,
    passedCount: checks.length - blockedCount,
    requiresNewVersion,
  };
}
