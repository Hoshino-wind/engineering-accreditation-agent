import type {
  SupportPackage,
  SupportPackageStatus,
  SupportTemplateKind,
} from '../../../entities/support-package';

export interface SupportPackageFilters {
  keyword: string;
  status: SupportPackageStatus | 'all';
  template: SupportTemplateKind | 'all';
}

export function filterSupportPackages(
  packages: SupportPackage[],
  filters: SupportPackageFilters,
) {
  const normalizedKeyword = filters.keyword.trim().toLocaleLowerCase(
    'zh-CN',
  );

  return packages.filter((supportPackage) => {
    const templateMatches =
      filters.template === 'all' ||
      supportPackage.template.kind === filters.template;
    const statusMatches =
      filters.status === 'all' ||
      supportPackage.status === filters.status;
    const keywordMatches =
      normalizedKeyword.length === 0 ||
      [
        supportPackage.displayId,
        supportPackage.title,
        supportPackage.course,
        supportPackage.template.name,
      ]
        .join(' ')
        .toLocaleLowerCase('zh-CN')
        .includes(normalizedKeyword);

    return templateMatches && statusMatches && keywordMatches;
  });
}
