import { SearchOutlined } from '@ant-design/icons';
import { Input, Select, Space } from 'antd';

import type {
  TeachingResourceStatus,
  TeachingResourceType,
} from '../../../entities/teaching-resource';

import './teachingResourceFilters.css';

interface TeachingResourceFiltersProps {
  course: string;
  courses: string[];
  keyword: string;
  resourceType: TeachingResourceType | 'all';
  status: TeachingResourceStatus | 'all';
  onCourseChange: (value: string) => void;
  onKeywordChange: (value: string) => void;
  onResourceTypeChange: (value: TeachingResourceType | 'all') => void;
  onStatusChange: (value: TeachingResourceStatus | 'all') => void;
}

export function TeachingResourceFilters({
  course,
  courses,
  keyword,
  onCourseChange,
  onKeywordChange,
  onResourceTypeChange,
  onStatusChange,
  resourceType,
  status,
}: TeachingResourceFiltersProps) {
  return (
    <Space className="teaching-resource-filters" size={8}>
      <Select
        aria-label="按课程筛选教学资源"
        onChange={onCourseChange}
        options={[
          { value: 'all', label: '全部课程' },
          ...courses.map((value) => ({ value, label: value })),
        ]}
        value={course}
      />
      <Select
        aria-label="按材料类型筛选教学资源"
        onChange={onResourceTypeChange}
        options={[
          { value: 'all', label: '全部材料类型' },
          { value: '课程大纲', label: '课程大纲' },
          { value: '实验指导书', label: '实验指导书' },
          { value: '实验项目清单', label: '实验项目清单' },
          { value: '评分表', label: '评分表' },
          { value: '学生报告', label: '学生报告' },
          { value: '评价结果', label: '评价结果' },
          { value: '改进记录', label: '改进记录' },
        ]}
        value={resourceType}
      />
      <Select
        aria-label="按处理状态筛选教学资源"
        onChange={onStatusChange}
        options={[
          { value: 'all', label: '全部处理状态' },
          { value: 'ready', label: '可用' },
          { value: 'processing', label: '处理中' },
          { value: 'awaitingClassification', label: '待分类' },
          { value: 'failed', label: '解析失败' },
          { value: 'quarantined', label: '已隔离' },
        ]}
        value={status}
      />
      <Input
        allowClear
        aria-label="搜索教学资源"
        onChange={(event) => onKeywordChange(event.target.value)}
        placeholder="搜索材料、文件名、课程或负责人"
        prefix={<SearchOutlined />}
        value={keyword}
      />
    </Space>
  );
}
