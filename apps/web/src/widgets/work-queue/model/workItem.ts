export type WorkItemStatus = 'pending' | 'processing' | 'blocked';
export type WorkItemType = '证据缺口' | '关系审核' | '评价准备';

export interface WorkItem {
  key: string;
  title: string;
  course: string;
  type: WorkItemType;
  status: WorkItemStatus;
  owner: string;
  updatedAt: string;
}

export interface WorkQueueFilters {
  keyword: string;
  status: WorkItemStatus | 'all';
  type: WorkItemType | 'all';
}
