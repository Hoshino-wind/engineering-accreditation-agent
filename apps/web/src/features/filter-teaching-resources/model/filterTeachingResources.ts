import type {
  TeachingResource,
  TeachingResourceStatus,
  TeachingResourceType,
} from '../../../entities/teaching-resource';

export interface TeachingResourceFilters {
  course: string;
  keyword: string;
  resourceType: TeachingResourceType | 'all';
  status: TeachingResourceStatus | 'all';
}

export function filterTeachingResources(
  resources: TeachingResource[],
  filters: TeachingResourceFilters,
): TeachingResource[] {
  const keyword = filters.keyword.trim().toLocaleLowerCase('zh-CN');

  return resources.filter((resource) => {
    const matchesKeyword =
      keyword.length === 0 ||
      [
        resource.course,
        resource.fileName,
        resource.name,
        resource.owner,
        resource.resourceType,
      ].some((value) =>
        value.toLocaleLowerCase('zh-CN').includes(keyword),
      );
    const matchesCourse =
      filters.course === 'all' || resource.course === filters.course;
    const matchesType =
      filters.resourceType === 'all' ||
      resource.resourceType === filters.resourceType;
    const matchesStatus =
      filters.status === 'all' || resource.status === filters.status;

    return matchesKeyword && matchesCourse && matchesType && matchesStatus;
  });
}
