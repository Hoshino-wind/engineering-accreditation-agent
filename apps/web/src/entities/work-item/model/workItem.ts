export type WorkItemStatus = 'pending' | 'processing' | 'blocked';
export type WorkItemType =
  | '材料处理'
  | '候选审核'
  | '图谱诊断'
  | '评价准备'
  | '改进复评';
export type WorkItemPriority = 'high' | 'medium';
export type WorkItemModule = 'M3' | 'M4' | 'M5' | 'M6' | 'M7';

export interface WorkItem {
  action: string;
  key: string;
  module: WorkItemModule;
  priority: WorkItemPriority;
  title: string;
  course: string;
  type: WorkItemType;
  status: WorkItemStatus;
  owner: string;
  dueAt: string;
}
