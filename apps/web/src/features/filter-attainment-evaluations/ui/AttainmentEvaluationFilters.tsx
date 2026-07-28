import { SearchOutlined } from '@ant-design/icons';
import { Input, Select } from 'antd';

import type { EvaluationItemStatus } from '../../../entities/attainment-evaluation';

import './attainmentEvaluationFilters.css';

interface AttainmentEvaluationFiltersProps {
  course: string;
  courses: string[];
  keyword: string;
  onCourseChange: (value: string) => void;
  onKeywordChange: (value: string) => void;
  onStatusChange: (value: EvaluationItemStatus | 'all') => void;
  status: EvaluationItemStatus | 'all';
}

export function AttainmentEvaluationFiltersControl({
  course,
  courses,
  keyword,
  onCourseChange,
  onKeywordChange,
  onStatusChange,
  status,
}: AttainmentEvaluationFiltersProps) {
  return (
    <div className="attainment-evaluation-filters">
      <div className="attainment-evaluation-filter-row">
        <Select
          aria-label="按课程筛选评价对象"
          onChange={onCourseChange}
          options={[
            { label: '全部课程', value: 'all' },
            ...courses.map((item) => ({
              label: item,
              value: item,
            })),
          ]}
          size="small"
          value={course}
        />
        <Select
          aria-label="按状态筛选评价对象"
          onChange={onStatusChange}
          options={[
            { label: '全部状态', value: 'all' },
            { label: '待复核', value: 'awaiting-review' },
            { label: '已批准', value: 'approved' },
            { label: '已阻断', value: 'blocked' },
            { label: '未达标', value: 'not-achieved' },
          ]}
          size="small"
          value={status}
        />
      </div>
      <Input
        allowClear
        aria-label="搜索课程目标或课程名称"
        onChange={(event) => onKeywordChange(event.target.value)}
        placeholder="搜索课程目标名称或课程名称"
        prefix={<SearchOutlined />}
        size="small"
        value={keyword}
      />
    </div>
  );
}
