import { SearchOutlined } from '@ant-design/icons';
import { Input, Select } from 'antd';

import type {
  SupportPackageStatus,
  SupportTemplateKind,
} from '../../../entities/support-package';

import './supportPackageFilters.css';

interface SupportPackageFiltersControlProps {
  keyword: string;
  onKeywordChange: (value: string) => void;
  onStatusChange: (value: SupportPackageStatus | 'all') => void;
  onTemplateChange: (value: SupportTemplateKind | 'all') => void;
  status: SupportPackageStatus | 'all';
  template: SupportTemplateKind | 'all';
}

export function SupportPackageFiltersControl({
  keyword,
  onKeywordChange,
  onStatusChange,
  onTemplateChange,
  status,
  template,
}: SupportPackageFiltersControlProps) {
  return (
    <div className="support-package-filters">
      <div>
        <Select
          aria-label="按模板筛选"
          onChange={onTemplateChange}
          options={[
            { label: '全部模板', value: 'all' },
            { label: '实验教学', value: 'experiment-teaching' },
            { label: '课程教学', value: 'course-teaching' },
            { label: '毕业设计', value: 'capstone' },
          ]}
          value={template}
        />
        <Select
          aria-label="按状态筛选"
          onChange={onStatusChange}
          options={[
            { label: '全部状态', value: 'all' },
            { label: '草稿', value: 'draft' },
            { label: '需修正', value: 'changes-required' },
            { label: '待复核', value: 'ready-for-review' },
            { label: '已批准', value: 'approved' },
            { label: '已导出', value: 'exported' },
          ]}
          value={status}
        />
      </div>
      <Input
        allowClear
        aria-label="搜索支撑包"
        onChange={(event) => onKeywordChange(event.target.value)}
        placeholder="搜索支撑包或课程名称"
        prefix={<SearchOutlined />}
        value={keyword}
      />
    </div>
  );
}
