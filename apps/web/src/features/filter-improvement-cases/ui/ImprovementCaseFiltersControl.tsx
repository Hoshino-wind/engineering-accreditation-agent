import { SearchOutlined } from '@ant-design/icons';
import { Input, Select } from 'antd';

import type {
  ImprovementCaseStatus,
  ImprovementSourceModule,
} from '../../../entities/improvement-case';

import './improvementCaseFilters.css';

interface ImprovementCaseFiltersControlProps {
  keyword: string;
  onKeywordChange: (value: string) => void;
  onSourceChange: (
    value: ImprovementSourceModule | 'all',
  ) => void;
  onStatusChange: (value: ImprovementCaseStatus | 'all') => void;
  source: ImprovementSourceModule | 'all';
  status: ImprovementCaseStatus | 'all';
}

export function ImprovementCaseFiltersControl({
  keyword,
  onKeywordChange,
  onSourceChange,
  onStatusChange,
  source,
  status,
}: ImprovementCaseFiltersControlProps) {
  return (
    <div className="improvement-case-filters">
      <div>
        <Select
          aria-label="按来源筛选"
          onChange={onSourceChange}
          options={[
            { label: '全部来源', value: 'all' },
            { label: 'M3 教学资源', value: 'M3' },
            { label: 'M5 图谱诊断', value: 'M5' },
            { label: 'M6 达成评价', value: 'M6' },
          ]}
          value={source}
        />
        <Select
          aria-label="按状态筛选"
          onChange={onStatusChange}
          options={[
            { label: '全部状态', value: 'all' },
            { label: '原因分析', value: 'diagnosing' },
            { label: '待审批', value: 'action-planned' },
            { label: '执行中', value: 'in-progress' },
            { label: '等待复评', value: 'awaiting-reevaluation' },
            { label: '待判效', value: 'awaiting-decision' },
            { label: '已关闭', value: 'closed' },
          ]}
          value={status}
        />
      </div>
      <Input
        allowClear
        aria-label="搜索改进问题"
        onChange={(event) => onKeywordChange(event.target.value)}
        placeholder="搜索问题标题或课程名称"
        prefix={<SearchOutlined />}
        value={keyword}
      />
    </div>
  );
}
