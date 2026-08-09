import { SearchOutlined } from '@ant-design/icons';
import { Input, Select, Space } from 'antd';

import type {
  RecognitionCandidateRisk,
  RecognitionCandidateType,
} from '../../../entities/recognition-candidate';

import './recognitionCandidateFilters.css';

interface RecognitionCandidateFiltersProps {
  candidateType: RecognitionCandidateType | 'all';
  course: string;
  courses: string[];
  isCourseLocked?: boolean;
  keyword: string;
  risk: RecognitionCandidateRisk | 'all';
  onCandidateTypeChange: (value: RecognitionCandidateType | 'all') => void;
  onCourseChange: (value: string) => void;
  onKeywordChange: (value: string) => void;
  onRiskChange: (value: RecognitionCandidateRisk | 'all') => void;
}

export function RecognitionCandidateFilters({
  candidateType,
  course,
  courses,
  isCourseLocked = false,
  keyword,
  onCandidateTypeChange,
  onCourseChange,
  onKeywordChange,
  onRiskChange,
  risk,
}: RecognitionCandidateFiltersProps) {
  return (
    <Space className="recognition-candidate-filters" size={8} wrap>
      {!isCourseLocked && (
        <Select
          aria-label="按课程筛选候选"
          onChange={onCourseChange}
          options={[
            { value: 'all', label: '全部课程' },
            ...courses.map((value) => ({ value, label: value })),
          ]}
          value={course}
        />
      )}
      <Select
        aria-label="按候选类型筛选"
        onChange={onCandidateTypeChange}
        options={[
          { value: 'all', label: '全部类型' },
          { value: '关系候选', label: '关系候选' },
          { value: '映射候选', label: '映射候选' },
          { value: '节点候选', label: '节点候选' },
        ]}
        value={candidateType}
      />
      <Select
        aria-label="按风险筛选候选"
        onChange={onRiskChange}
        options={[
          { value: 'all', label: '全部风险' },
          { value: 'highImpact', label: '高影响' },
          { value: 'lowConfidence', label: '低置信度' },
          { value: 'conflict', label: '冲突' },
          { value: 'normal', label: '常规' },
        ]}
        value={risk}
      />
      <Input
        allowClear
        aria-label="搜索识别候选"
        onChange={(event) => onKeywordChange(event.target.value)}
        placeholder="搜索关系、目标节点或来源"
        prefix={<SearchOutlined />}
        value={keyword}
      />
    </Space>
  );
}
