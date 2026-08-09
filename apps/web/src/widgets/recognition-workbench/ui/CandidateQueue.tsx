import { Card, Progress, Segmented, Table, Typography } from 'antd';
import type { TableProps } from 'antd';

import {
  RecognitionCandidateRiskTag,
  RecognitionCandidateTypeTag,
  type RecognitionCandidate,
  type RecognitionCandidateRisk,
  type RecognitionCandidateType,
} from '../../../entities/recognition-candidate';
import { RecognitionCandidateFilters } from '../../../features/filter-recognition-candidates';

interface CandidateQueueProps {
  candidateType: RecognitionCandidateType | 'all';
  candidates: RecognitionCandidate[];
  course: string;
  courses: string[];
  isCourseLocked?: boolean;
  keyword: string;
  onCandidateTypeChange: (value: RecognitionCandidateType | 'all') => void;
  onCourseChange: (value: string) => void;
  onKeywordChange: (value: string) => void;
  onRiskChange: (value: RecognitionCandidateRisk | 'all') => void;
  onSelect: (candidate: RecognitionCandidate) => void;
  onReviewStatusChange: (value: 'pending' | 'all') => void;
  reviewStatus: 'pending' | 'all';
  risk: RecognitionCandidateRisk | 'all';
  selectedCandidateId?: string;
  totalCount: number;
}

const columns: TableProps<RecognitionCandidate>['columns'] = [
  {
    dataIndex: 'title',
    key: 'title',
    title: '候选',
    width: 222,
    render: (value: string, candidate) => (
      <div className="candidate-queue-title">
        <Typography.Text strong>{value}</Typography.Text>
        <div>
          <RecognitionCandidateTypeTag
            candidateType={candidate.candidateType}
          />
          <Typography.Text type="secondary">
            {candidate.course}
          </Typography.Text>
        </div>
      </div>
    ),
  },
  {
    align: 'center',
    dataIndex: 'confidence',
    key: 'confidence',
    title: '置信度',
    width: 74,
    render: (value: number) => (
      <Progress
        format={() => `${value}%`}
        percent={value}
        size={38}
        status={value < 70 ? 'exception' : 'normal'}
        strokeColor={value < 70 ? '#d4380d' : '#2f6fed'}
        type="circle"
      />
    ),
  },
  {
    dataIndex: 'risk',
    key: 'risk',
    title: '风险',
    width: 84,
    render: (value: RecognitionCandidate['risk']) => (
      <RecognitionCandidateRiskTag risk={value} />
    ),
  },
];

export function CandidateQueue({
  candidateType,
  candidates,
  course,
  courses,
  isCourseLocked,
  keyword,
  onCandidateTypeChange,
  onCourseChange,
  onKeywordChange,
  onRiskChange,
  onSelect,
  onReviewStatusChange,
  reviewStatus,
  risk,
  selectedCandidateId,
  totalCount,
}: CandidateQueueProps) {
  return (
    <Card
      className="candidate-queue"
      extra={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Segmented
            value={reviewStatus}
            options={[
              { label: `待审核 ${totalCount}`, value: 'pending' },
              { label: `全部 (含AI已处理) ${candidates.length}`, value: 'all' },
            ]}
            onChange={(val) => onReviewStatusChange(val as 'pending' | 'all')}
          />
        </div>
      }
      size="small"
      title="候选队列"
    >
      <RecognitionCandidateFilters
        candidateType={candidateType}
        course={course}
        courses={courses}
        isCourseLocked={isCourseLocked}
        keyword={keyword}
        onCandidateTypeChange={onCandidateTypeChange}
        onCourseChange={onCourseChange}
        onKeywordChange={onKeywordChange}
        onRiskChange={onRiskChange}
        risk={risk}
      />
      <Table<RecognitionCandidate>
        columns={columns}
        dataSource={candidates}
        locale={{
          emptyText:
            reviewStatus === 'pending'
              ? 'AI 已自动审核完毕，暂无待人工审核的候选'
              : '没有符合条件的候选',
        }}
        onRow={(candidate) => ({
          'aria-selected': candidate.id === selectedCandidateId,
          onClick: () => onSelect(candidate),
        })}
        pagination={false}
        rowClassName={(candidate) =>
          candidate.id === selectedCandidateId
            ? 'candidate-queue-row--selected'
            : ''
        }
        rowKey="id"
        scroll={{ y: 360 }}
        size="small"
      />
    </Card>
  );
}
