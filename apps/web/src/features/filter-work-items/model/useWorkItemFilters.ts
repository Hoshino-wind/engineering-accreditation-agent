import { useMemo, useState } from 'react';

import type {
  WorkItem,
  WorkItemStatus,
  WorkItemType,
} from '../../../entities/work-item';
import { filterWorkItems } from './filterWorkItems';

export function useWorkItemFilters(sourceItems: WorkItem[]) {
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<WorkItemStatus | 'all'>('all');
  const [type, setType] = useState<WorkItemType | 'all'>('all');

  const items = useMemo(
    () =>
      filterWorkItems(sourceItems, {
        keyword,
        status,
        type,
      }),
    [keyword, sourceItems, status, type],
  );

  return {
    items,
    keyword,
    setKeyword,
    setStatus,
    setType,
    status,
    type,
  };
}
