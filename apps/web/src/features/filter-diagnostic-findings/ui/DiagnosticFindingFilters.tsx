import { SearchOutlined } from '@ant-design/icons';
import { Input, Select } from 'antd';

import type {
  DiagnosticFindingRisk,
  DiagnosticFindingType,
} from '../../../entities/diagnostic-finding';

import './diagnosticFindingFilters.css';

interface DiagnosticFindingFiltersProps {
  course: string;
  courses: string[];
  findingType: DiagnosticFindingType | 'all';
  keyword: string;
  onCourseChange: (value: string) => void;
  onFindingTypeChange: (value: DiagnosticFindingType | 'all') => void;
  onKeywordChange: (value: string) => void;
  onRiskChange: (value: DiagnosticFindingRisk | 'all') => void;
  risk: DiagnosticFindingRisk | 'all';
}

export function DiagnosticFindingFilters({
  course,
  courses,
  findingType,
  keyword,
  onCourseChange,
  onFindingTypeChange,
  onKeywordChange,
  onRiskChange,
  risk,
}: DiagnosticFindingFiltersProps) {
  return (
    <div className="diagnostic-finding-filters">
      <div className="diagnostic-finding-filter-row">
        <Select
          aria-label="按课程筛选诊断发现"
          onChange={onCourseChange}
          options={[
            { value: 'all', label: '全部课程' },
            ...courses.map((item) => ({ value: item, label: item })),
          ]}
          value={course}
        />
        <Select
          aria-label="按类型筛选诊断发现"
          onChange={onFindingTypeChange}
          options={[
            { value: 'all', label: '全部类型' },
            { value: 'coverage-gap', label: '覆盖缺口' },
            { value: 'material-conflict', label: '材料冲突' },
            { value: 'structural-risk', label: '结构风险' },
            { value: 'version-impact', label: '版本影响' },
          ]}
          value={findingType}
        />
        <Select
          aria-label="按风险筛选诊断发现"
          onChange={onRiskChange}
          options={[
            { value: 'all', label: '全部风险' },
            { value: 'high', label: '高风险' },
            { value: 'medium', label: '中风险' },
            { value: 'low', label: '低风险' },
          ]}
          value={risk}
        />
      </div>
      <Input
        allowClear
        aria-label="搜索诊断发现"
        onChange={(event) => onKeywordChange(event.target.value)}
        placeholder="搜索发现标题、课程或规则编号"
        prefix={<SearchOutlined />}
        value={keyword}
      />
    </div>
  );
}
