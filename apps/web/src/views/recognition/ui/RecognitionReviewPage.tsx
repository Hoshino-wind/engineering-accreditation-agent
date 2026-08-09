import { InfoCircleOutlined } from '@ant-design/icons';
import { Alert, Tag, Typography } from 'antd';
import { useMemo } from 'react';

import { useRecognitionCandidates } from '../../../entities/recognition-candidate';
import { useCourseState } from '../../../shared/course/useCourseState';
import { RecognitionSummary } from '../../../widgets/recognition-summary';
import { RecognitionWorkbench } from '../../../widgets/recognition-workbench';
import { NextStepBanner } from '../../../widgets/next-step-banner/ui/NextStepBanner';

import './recognitionReviewPage.css';

const { Paragraph, Title } = Typography;

export function RecognitionReviewPage() {
  const {
    candidates,
    loadFailed,
    loading,
    reload,
    updateCandidate,
  } = useRecognitionCandidates();
  const { selectedCourseName: currentCourseName } = useCourseState();

  // 按当前选中课程过滤候选列表
  const filteredCandidates = useMemo(
    () =>
      currentCourseName
        ? candidates.filter((c) => c.course === currentCourseName)
        : candidates,
    [candidates, currentCourseName],
  );

  const notice = useMemo(() => {
    const pending = filteredCandidates.filter(
      (c) => (c.reviewStatus ?? 'pending') === 'pending',
    ).length;
    const highImpact = filteredCandidates.filter(
      (c) => c.risk === 'highImpact',
    ).length;
    const conflicts = filteredCandidates.filter(
      (c) => c.risk === 'conflict' || Boolean(c.conflictMessage),
    ).length;
    return { conflicts, highImpact, pending, total: filteredCandidates.length };
  }, [filteredCandidates]);

  return (
    <main className="recognition-review-page mi-paper-bg">
      <div className="recognition-review-page-header">
        <div>
          <div className="gv-plate-row">
            <span className="mi-module-plate">ADVANCED · BATCH REVIEW</span>
            <Tag color="cyan">数据来自识别库实时接口</Tag>
          </div>
          <Title level={2} style={{ marginTop: 8 }}>批量审核 / 冲突处理</Title>
          <Paragraph type="secondary">
            这是高级批量审核入口。日常审核请在「② 能力图谱」右侧侧栏就地完成；当候选量大、需集中处理冲突或高影响关系时，再使用此工作台。
          </Paragraph>
        </div>
      </div>

      {filteredCandidates.length > 0 ? (
        <Alert
          className="recognition-review-notice"
          description={`识别库当前共 ${notice.total} 条候选，其中 ${notice.pending} 条待审核、${notice.highImpact} 条高影响关系、${notice.conflicts} 条存在冲突；请先处理风险项，再提交正式图谱。`}
          icon={<InfoCircleOutlined />}
          showIcon
          title="当前重点：优先处理冲突、低置信度和高影响关系"
          type="warning"
        />
      ) : null}

      <RecognitionSummary candidates={filteredCandidates} />
      <RecognitionWorkbench
        candidates={filteredCandidates}
        loadFailed={loadFailed}
        loading={loading}
        onCandidateUpdated={updateCandidate}
        onReload={() => void reload()}
      />
      <NextStepBanner currentPath="/recognition" />
    </main>
  );
}
