import type { Key } from 'react';
import { useMemo, useState } from 'react';

import { filterWorkItems } from './filterWorkItems';
import { prototypeOnlyWorkItems } from './prototypeOnlyWorkItems';
import type { WorkItemStatus, WorkItemType } from './workItem';

export function useWorkQueue() {
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<WorkItemStatus | 'all'>('all');
  const [type, setType] = useState<WorkItemType | 'all'>('all');
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([
    prototypeOnlyWorkItems[0]?.key ?? '',
  ]);

  const items = useMemo(
    () =>
      filterWorkItems(prototypeOnlyWorkItems, {
        keyword,
        status,
        type,
      }),
    [keyword, status, type],
  );

  return {
    items,
    keyword,
    selectedRowKeys,
    setKeyword,
    setSelectedRowKeys,
    setStatus,
    setType,
    status,
    type,
  };
}
