import type { WorkItem, WorkQueueFilters } from './workItem';

export function filterWorkItems(
  items: WorkItem[],
  filters: WorkQueueFilters,
): WorkItem[] {
  const keyword = filters.keyword.trim().toLocaleLowerCase('zh-CN');

  return items.filter((item) => {
    const matchesKeyword =
      keyword.length === 0 ||
      [item.title, item.course, item.owner].some((value) =>
        value.toLocaleLowerCase('zh-CN').includes(keyword),
      );
    const matchesStatus =
      filters.status === 'all' || item.status === filters.status;
    const matchesType = filters.type === 'all' || item.type === filters.type;
    return matchesKeyword && matchesStatus && matchesType;
  });
}
