import { CloudUploadOutlined, ReloadOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Empty, Spin } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { useCourseState } from '../../../shared/course/useCourseState';

import {
  mapDiagnosticFinding,
  useDiagnosticFindings,
  type DiagnosticFinding,
} from '../../../entities/diagnostic-finding';
import { useFindingDecisionDrafts } from '../../../features/decide-diagnostic-finding';
import { useDiagnosticFindingFilters } from '../../../features/filter-diagnostic-findings';
import { DiagnosticEvidenceDrawer } from '../../../features/inspect-diagnostic-evidence';
import { decideFinding } from '../../../shared/api/diagnosticsClient';
import { DiagnosticFindingAnalysis } from './DiagnosticFindingAnalysis';
import { DiagnosticFindingDisposition } from './DiagnosticFindingDisposition';
import { DiagnosticFindingQueue } from './DiagnosticFindingQueue';

import './diagnosticWorkbench.css';

export function DiagnosticWorkbench() {
  const navigate = useNavigate();
  const { selectedCourseName: currentCourseName } = useCourseState();
  const { findings, loadFailed, loading, reload, updateFinding } =
    useDiagnosticFindings();
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    text: string;
    type: 'error' | 'success' | 'warning';
  } | null>(null);

  const filters = useDiagnosticFindingFilters(findings, currentCourseName);
  const decisionDrafts = useFindingDecisionDrafts();
  const [selectedFindingId, setSelectedFindingId] = useState<string>();
  const [evidenceDrawerOpen, setEvidenceDrawerOpen] = useState(false);

  const selectedFinding =
    filters.findings.find((finding) => finding.id === selectedFindingId) ??
    filters.findings[0] ??
    null;
  const selectedDraft = selectedFinding
    ? decisionDrafts.getDraft(selectedFinding.id)
    : { note: '' };

  const handleSelect = (finding: DiagnosticFinding) => {
    setSelectedFindingId(finding.id);
  };

  const handleSubmitDecision = async () => {
    if (!selectedFinding || !selectedDraft.decision) return;
    const decision = selectedDraft.decision;
    setSubmittingId(selectedFinding.id);
    setFeedback(null);

    // 返回审核 / 豁免 为纯动线引导动作，后端不接收，仅做本地提示
    if (decision === 'return-recognition' || decision === 'exempt') {
      setSubmittingId(null);
      setFeedback({
        text:
          decision === 'return-recognition'
            ? '该动作为流程引导：请前往 ③ 关系审核 复核相关候选关系。'
            : '豁免为评审会议结论动作，先在本地草稿记录，评审后统一归档。',
        type: 'warning',
      });
      return;
    }

    const raw = await decideFinding(selectedFinding.id, decision);
    setSubmittingId(null);
    if (raw) {
      updateFinding(mapDiagnosticFinding(raw));
      if (decision === 'convert') {
        void navigate(`/improvements?finding=${selectedFinding.id}`, {
          state: {
            findingId: selectedFinding.id,
            targetCode: selectedFinding.targetNode.split(' ', 1)[0],
            targetName: selectedFinding.targetNode,
            summary: selectedFinding.rule.rationale,
          },
        });
        return;
      }
      setFeedback({
        text: '处置决定已写入诊断库，该发现的处置状态已实时更新。',
        type: 'success',
      });
    } else {
      setFeedback({
        text: '处置写入失败，请检查后端服务是否运行后重试。',
        type: 'error',
      });
    }
  };

  if (loading) {
    return (
      <Card size="small">
        <div style={{ padding: '64px 0', textAlign: 'center' }}>
          <Spin size="large" tip="正在从诊断库加载真实发现数据…" />
        </div>
      </Card>
    );
  }

  if (findings.length === 0) {
    return (
      <Card size="small">
        <div style={{ padding: '48px 0' }}>
          {loadFailed ? (
            <Alert
              action={
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => void reload()}
                  size="small"
                >
                  重试
                </Button>
              }
              description="无法连接后端诊断服务。请确认 API 服务已启动（pnpm dev），然后重试。"
              showIcon
              title="诊断发现加载失败"
              type="error"
            />
          ) : (
            <Empty description="诊断库中还没有发现。上传教学材料并完成覆盖度分析后，AI 会自动生成缺口诊断。">
              <Button
                icon={<CloudUploadOutlined />}
                onClick={() => navigate('/resources')}
                type="primary"
              >
                去 ① 上传教学材料
              </Button>
            </Empty>
          )}
        </div>
      </Card>
    );
  }

  return (
    <>
      {feedback ? (
        <Alert
          closable
          description={feedback.text}
          onClose={() => setFeedback(null)}
          showIcon
          style={{ marginBottom: 12 }}
          title={
            feedback.type === 'success'
              ? '处置已提交'
              : feedback.type === 'warning'
                ? '本地动作提示'
                : '提交失败'
          }
          type={feedback.type}
        />
      ) : null}
      <section className="diagnostic-workbench">
        <DiagnosticFindingQueue
          course={filters.course}
          courses={filters.courses}
          findingType={filters.findingType}
          findings={filters.findings}
          isCourseLocked={filters.isCourseLocked}
          keyword={filters.keyword}
          onCourseChange={filters.setCourse}
          onFindingTypeChange={filters.setFindingType}
          onKeywordChange={filters.setKeyword}
          onRiskChange={filters.setRisk}
          onSelect={handleSelect}
          risk={filters.risk}
          selectedFindingId={selectedFinding?.id}
        />
        <DiagnosticFindingAnalysis finding={selectedFinding} />
        <DiagnosticFindingDisposition
          draft={selectedDraft}
          finding={selectedFinding}
          onDecisionChange={(decision) => {
            if (selectedFinding) {
              decisionDrafts.setDecision(selectedFinding.id, decision);
            }
          }}
          onInspectEvidence={() => setEvidenceDrawerOpen(true)}
          onNoteChange={(note) => {
            if (selectedFinding) {
              decisionDrafts.setNote(selectedFinding.id, note);
            }
          }}
          onSubmitDecision={() => void handleSubmitDecision()}
          submitting={submittingId === selectedFinding?.id}
        />
      </section>
      <DiagnosticEvidenceDrawer
        finding={selectedFinding}
        onClose={() => setEvidenceDrawerOpen(false)}
        open={evidenceDrawerOpen}
      />
    </>
  );
}
