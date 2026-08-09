import {
  ArrowRightOutlined,
  BulbOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  NodeIndexOutlined,
  PlusOutlined,
  RightOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Progress,
  Row,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import {
  type CoverageStatus,
  analyzeCoverage,
  explainCompetencyGap,
  explainRequirementGap,
} from '../../../features/analyze-coverage';
import { useAbilityGraphData, filterGraphByCourse } from '../../../entities/ability-graph';
import { DiagnosticWorkbench } from '../../../widgets/diagnostic-workbench';
import { EmptyStateGuide } from '../../../widgets/empty-state-guide';
import { NextStepBanner } from '../../../widgets/next-step-banner/ui/NextStepBanner';
import { useCourseState } from '../../../shared/course/useCourseState';

import './graphDiagnosticsPage.css';

const { Paragraph, Text, Title } = Typography;

const STATUS_CONFIG: Record<
  CoverageStatus,
  { color: string; label: string; tagColor: string }
> = {
  covered: { color: '#52c41a', label: '已覆盖', tagColor: 'success' },
  partial: { color: '#faad14', label: '部分覆盖', tagColor: 'warning' },
  gap: { color: '#ff4d4f', label: '缺口', tagColor: 'error' },
};

export function GraphDiagnosticsPage() {
  const navigate = useNavigate();
  const { graph, loading: graphLoading, source } = useAbilityGraphData();
  const { selectedCourseName: currentCourseName } = useCourseState();

  // 按当前选中课程过滤图谱后再做覆盖率分析
  const courseGraph = useMemo(
    () => filterGraphByCourse(graph, currentCourseName),
    [graph, currentCourseName],
  );
  const report = useMemo(
    () => analyzeCoverage(courseGraph),
    [courseGraph],
  );
  const [selectedReqId, setSelectedReqId] = useState<string | undefined>();

  const selectedReq = report.requirements.find(
    (r) => r.requirement.id === selectedReqId,
  );

  return (
    <main className="graph-diagnostics-page mi-paper-bg">
      <div className="graph-diagnostics-page-header">
        <div>
          <div className="gv-plate-row">
            <span className="mi-module-plate">STEP · 05 · COVERAGE DIAGNOSTICS</span>
            <Tag color="gold">内置 2024 标准</Tag>
            {source === 'api' ? (
              <Tag color="cyan">覆盖率由后端实时图谱计算</Tag>
            ) : (
              <Tag>后端未连接 · 等待数据加载</Tag>
            )}
          </div>
          <Title level={2} style={{ marginTop: 8 }}>图谱诊断与覆盖率分析</Title>
          <Paragraph type="secondary">
            对比学校上传数据与系统内置 2024 版认证标准的覆盖情况，
            红色为缺口（无任何课程支撑），黄色为部分覆盖（支撑不足），
            绿色为已覆盖。孤岛节点为上传但未关联任何标准的数据。
          </Paragraph>
        </div>
      </div>

      {graphLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
          <Spin size="large" />
        </div>
      ) : courseGraph.nodes.length === 0 ? (
        <EmptyStateGuide
          title="还没有诊断数据"
          description="完成图谱构建和智能识别后，系统会自动生成覆盖缺口和一致性诊断报告"
          ctaText="查看图谱"
          ctaPath="/graph"
        />
      ) : (
        <>
          {/* 总览统计 */}
          <Card className="diagnostics-stats mi-card" size="small">
        <Row gutter={24}>
          <Col>
            <Statistic
              title="总体覆盖率"
              value={Math.round(report.overallCoverageRate * 100)}
              suffix="%"
              styles={{
                value: {
                  color:
                    report.overallCoverageRate >= 0.8
                      ? '#52c41a'
                      : report.overallCoverageRate >= 0.5
                        ? '#faad14'
                        : '#ff4d4f',
                },
              }}
            />
          </Col>
          <Col>
            <Statistic
              title="缺口数"
              value={report.gapCount}
              styles={{ value: { color: '#ff4d4f' } }}
              prefix={<WarningOutlined />}
            />
          </Col>
          <Col>
            <Statistic
              title="部分覆盖"
              value={report.partialCount}
              styles={{ value: { color: '#faad14' } }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Col>
          <Col>
            <Statistic
              title="孤岛节点"
              value={report.orphanNodes.length}
              styles={{ value: { color: '#ff4d4f' } }}
              prefix={<NodeIndexOutlined />}
            />
          </Col>
        </Row>
      </Card>

      {report.orphanNodes.length > 0 && (
        <Alert
          className="diagnostics-orphan-alert"
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          title={`发现 ${report.orphanNodes.length} 个孤岛节点（上传但未关联任何标准）`}
          description={report.orphanNodes
            .map((n) => `${n.code} ${n.name}`)
            .join('、')}
        />
      )}

      {/* 毕业要求覆盖率 + 详情：左右分栏 */}
      <Row gutter={16} className="diagnostics-split-layout">
        <Col span={10} className="diagnostics-left-col">
          <Card
            title="毕业要求覆盖率"
            size="small"
            className="diagnostics-coverage-card"
          >
            <div className="diagnostics-coverage-list">
              {report.requirements.map((rc) => {
            const cfg = STATUS_CONFIG[rc.status];
            const isSelected = selectedReqId === rc.requirement.id;
            return (
              <div
                key={rc.requirement.id}
                className={`diagnostics-coverage-item ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedReqId(rc.requirement.id)}
              >
                <div className="diagnostics-coverage-item-header">
                  <Space size={8}>
                    <Tag color={cfg.tagColor}>{rc.requirement.code}</Tag>
                    <Text strong>{rc.requirement.name}</Text>
                  </Space>
                  <Tag color={cfg.tagColor}>{cfg.label}</Tag>
                </div>
                <Progress
                  percent={Math.round(rc.coverageRate * 100)}
                  strokeColor={cfg.color}
                  size="small"
                  format={(p) => `${p}%`}
                />
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {cfg.label} · {Math.round(rc.coverageRate * 100)}%
                </Text>
                <div className="diagnostics-coverage-item-meta">
                  <Text type="secondary">
                    能力指标 {rc.competencies.filter((c) => c.status === 'covered').length}/
                    {rc.competencies.length} 已覆盖
                  </Text>
                  {rc.supportingCourses.length > 0 && (
                    <Text type="secondary">
                      {' · '}支撑课程 {rc.supportingCourses.length} 门
                      {rc.strongSupportCount > 0 &&
                        `（强支撑 ${rc.strongSupportCount}）`}
                    </Text>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
        </Col>
        <Col span={14} className="diagnostics-right-col">
          {/* 选中毕业要求的详情 */}
          {selectedReq ? (
            <Card
              title={`${selectedReq.requirement.code} ${selectedReq.requirement.name} — 能力指标明细`}
              size="small"
              className="diagnostics-detail-card"
            >
          <Paragraph type="secondary">
            {selectedReq.requirement.description}
          </Paragraph>

          {/* 毕业要求级解释（仅 gap/partial 时显示） */}
          {selectedReq.status !== 'covered' && (() => {
            const reqExp = explainRequirementGap(selectedReq, courseGraph);
            return (
              <div className={`gap-explanation ${selectedReq.status === 'partial' ? 'gap-explanation--partial' : ''}`}>
                <div className="gap-explanation-summary">{reqExp.summary}</div>
                {reqExp.gapReasons.length > 0 && (
                  <div className="gap-explanation-section">
                    <div className="gap-explanation-section-title">
                      <ExclamationCircleOutlined /> 缺口原因
                    </div>
                    {reqExp.gapReasons.map((reason, i) => (
                      <div key={i} className="gap-explanation-reason">
                        <RightOutlined />
                        <span>{reason.description}</span>
                      </div>
                    ))}
                  </div>
                )}
                {reqExp.brokenPaths.length > 0 && (
                  <div className="gap-explanation-section">
                    <div className="gap-explanation-section-title">
                      <ArrowRightOutlined /> 断裂路径
                    </div>
                    {reqExp.brokenPaths.map((bp, i) => (
                      <div key={i} className="gap-explanation-broken-path">
                        {bp.from} <RightOutlined /> {bp.to}：{bp.description}（缺失：{bp.missingType}）
                      </div>
                    ))}
                  </div>
                )}
                {reqExp.recommendations.length > 0 && (
                  <div className="gap-explanation-section">
                    <div className="gap-explanation-section-title">
                      <BulbOutlined /> 建议方向
                    </div>
                    {reqExp.recommendations.map((rec, i) => (
                      <div key={i} className="gap-explanation-recommendation">
                        <BulbOutlined />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          <div className="diagnostics-detail-list">
            {selectedReq.competencies.map((cc) => {
              const cfg = STATUS_CONFIG[cc.status];
              const compExp = cc.status !== 'covered'
                ? explainCompetencyGap(cc, courseGraph)
                : null;
              return (
                <div key={cc.competency.id} className="diagnostics-detail-item">
                  <div className="diagnostics-detail-item-header">
                    <Space size={8}>
                      <Tag color={cfg.tagColor}>{cc.competency.code}</Tag>
                      <Text strong>{cc.competency.name}</Text>
                      {cc.hasPendingReview && (
                        <Tag color="orange">AI 待审核</Tag>
                      )}
                    </Space>
                    <Tag color={cfg.tagColor}>{cfg.label}</Tag>
                  </div>
                  <Paragraph
                    type="secondary"
                    style={{ margin: '4px 0', fontSize: 12 }}
                  >
                    {cc.competency.description}
                  </Paragraph>
                  {cc.supporters.length > 0 ? (
                    <Space size={4} wrap>
                      {cc.supporters.map((s) => (
                        <Tag key={s.id} color="blue">
                          {s.code} {s.name}
                        </Tag>
                      ))}
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        强{cc.strongCount} 中{cc.mediumCount} 弱{cc.weakCount}
                      </Text>
                    </Space>
                  ) : (
                    <Text type="danger" style={{ fontSize: 12 }}>
                      <InfoCircleOutlined /> 暂无课程支撑，建议补充相关教学环节
                    </Text>
                  )}

                  {/* 能力指标级数据驱动解释 */}
                  {compExp && (
                    <div className={`gap-explanation ${cc.status === 'partial' ? 'gap-explanation--partial' : ''}`}>
                      <div className="gap-explanation-summary">{compExp.summary}</div>
                      {compExp.gapReasons.length > 0 && (
                        <div className="gap-explanation-section">
                          <div className="gap-explanation-section-title">
                            <ExclamationCircleOutlined /> 缺口原因
                          </div>
                          {compExp.gapReasons.map((reason, i) => (
                            <div key={i} className="gap-explanation-reason">
                              <RightOutlined />
                              <span>{reason.description}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {compExp.brokenPaths.length > 0 && (
                        <div className="gap-explanation-section">
                          <div className="gap-explanation-section-title">
                            <ArrowRightOutlined /> 断裂路径
                          </div>
                          {compExp.brokenPaths.map((bp, i) => (
                            <div key={i} className="gap-explanation-broken-path">
                              {bp.from} <RightOutlined /> {bp.to}：缺失 {bp.missingType}
                            </div>
                          ))}
                        </div>
                      )}
                      {compExp.recommendations.length > 0 && (
                        <div className="gap-explanation-section">
                          <div className="gap-explanation-section-title">
                            <BulbOutlined /> 建议方向
                          </div>
                          {compExp.recommendations.map((rec, i) => (
                            <div key={i} className="gap-explanation-recommendation">
                              <BulbOutlined />
                              <span>{rec}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="gap-explanation-attainment">
                        <Text type="secondary" style={{ fontSize: 12 }}>达成度</Text>
                        <span className="gap-explanation-attainment-value">
                          {Math.round(compExp.attainment * 100)}%
                        </span>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          / 阈值 {Math.round(compExp.threshold * 100)}%
                        </Text>
                      </div>
                    </div>
                  )}
                  {cc.status !== 'covered' && (
                    <Button
                      type="primary"
                      size="small"
                      icon={<PlusOutlined />}
                      style={{ marginTop: 10 }}
                      onClick={() =>
                        navigate('/improvements', {
                          state: {
                            targetCode: cc.competency.code,
                            targetName: cc.competency.name,
                            summary: compExp?.summary ?? '',
                          },
                        })
                      }
                    >
                      创建改进措施
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <Empty
          description="点击上方毕业要求查看能力指标覆盖详情"
          className="diagnostics-empty"
        />
      )}
        </Col>
      </Row>
        </>
      )}

      <div className="diagnostics-findings-section">
        <Space align="center" size={10} style={{ marginBottom: 12 }}>
          <Title level={4} style={{ margin: 0 }}>诊断发现处置</Title>
          <Tag color="cyan">数据来自诊断库实时接口</Tag>
        </Space>
        <Paragraph type="secondary">
          覆盖缺口经 AI 语义诊断后生成下列发现；处置决定（确认 / 转入改进 / 忽略）会实时写回诊断库。
        </Paragraph>
        <DiagnosticWorkbench />
      </div>

      <NextStepBanner currentPath="/diagnostics" />
    </main>
  );
}
