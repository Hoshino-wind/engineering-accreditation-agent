import { SearchOutlined } from '@ant-design/icons';
import { Input, Select, Space } from 'antd';

import type {
  WorkItemStatus,
  WorkItemType,
} from '../../../entities/work-item';

import './workItemFilters.css';

interface WorkItemFiltersProps {
  keyword: string;
  status: WorkItemStatus | 'all';
  type: WorkItemType | 'all';
  onKeywordChange: (value: string) => void;
  onStatusChange: (value: WorkItemStatus | 'all') => void;
  onTypeChange: (value: WorkItemType | 'all') => void;
}

export function WorkItemFilters({
  keyword,
  onKeywordChange,
  onStatusChange,
  onTypeChange,
  status,
  type,
}: WorkItemFiltersProps) {
  return (
    <Space className="work-item-filters" size={8}>
      <Select
        aria-label="按类型筛选"
        onChange={onTypeChange}
        options={[
          { value: 'all', label: '全部类型' },
          { value: '证据缺口', label: '证据缺口' },
          { value: '关系审核', label: '关系审核' },
          { value: '评价准备', label: '评价准备' },
        ]}
        value={type}
      />
      <Select
        aria-label="按状态筛选"
        onChange={onStatusChange}
        options={[
          { value: 'all', label: '全部状态' },
          { value: 'pending', label: '待处理' },
          { value: 'processing', label: '处理中' },
          { value: 'blocked', label: '待补充' },
        ]}
        value={status}
      />
      <Input
        allowClear
        aria-label="搜索待处理事项"
        onChange={(event) => onKeywordChange(event.target.value)}
        placeholder="搜索事项、课程或负责人"
        prefix={<SearchOutlined />}
        value={keyword}
      />
    </Space>
  );
}
