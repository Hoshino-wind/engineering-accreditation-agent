import {
  CheckCircleFilled,
  CloudUploadOutlined,
  DownOutlined,
  LoadingOutlined,
  NodeIndexOutlined,
  RightOutlined,
  SolutionOutlined,
  FileSearchOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import {
  type PipelineStage,
  fetchPipelineStatus,
  getStageIndex,
} from '../../../shared/api/pipelineClient';
import { useCourseState } from '../../../shared/course/useCourseState';
import { CourseMatrix } from '../../../widgets/course-matrix';
import { OverviewMetrics } from '../../../widgets/overview-metrics';
import './overviewPage.css';

// 5 步动态工作流定义
const WORKFLOW_STEPS = [
  {
    no: '01',
    title: '教学资源',
    desc: '上传培养方案、课程大纲、实验指导书等材料',
    detail: 'AI 自动提取能力节点，构建支撑关系候选',
    path: '/resources',
    icon: <CloudUploadOutlined />,
    stageAfter: 'extracting' as PipelineStage,
    metricHint: '上传后自动分析',
  },
  {
    no: '02',
    title: '能力图谱',
    desc: '查看 AI 推断的节点与支撑关系',
    detail: '图谱节点按 origin 区分（standard / school），关系按强度加权',
    path: '/graph',
    icon: <NodeIndexOutlined />,
    stageAfter: 'reviewing' as PipelineStage,
    metricHint: '查看图谱拓扑',
  },
  {
    no: '03',
    title: '智能识别审核',
    desc: '确认 / 驳回 AI 推荐的映射关系',
    detail: 'AI 推断关系初始为「待审核」，确认后才参与达成度计算',
    path: '/recognition',
    icon: <SolutionOutlined />,
    stageAfter: 'diagnosing' as PipelineStage,
    metricHint: '审核候选关系',
  },
  {
    no: '04',
    title: '图谱诊断',
    desc: '查看覆盖缺口与材料一致性诊断',
    detail: '确定性规则 + 语义匹配，诊断分 deterministic / ai-semantic 两类',
    path: '/diagnostics',
    icon: <FileSearchOutlined />,
    stageAfter: 'done' as PipelineStage,
    metricHint: '查看缺口分析',
  },
  {
    no: '05',
    title: '教学改进',
    desc: '创建改进措施，跟踪闭环',
    detail: '基于诊断结果生成改进建议，跟踪至闭环',
    path: '/improvements',
    icon: <CheckCircleOutlined />,
    stageAfter: 'done' as PipelineStage,
    metricHint: '跟踪改进措施',
  },
];

export function OverviewPage() {
  const navigate = useNavigate();
  const { selectedCourseName } = useCourseState();
  const [heroReady, setHeroReady] = useState(false);
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>('idle');
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  // Hero 入场
  useEffect(() => {
    const t = setTimeout(() => setHeroReady(true), 60);
    return () => clearTimeout(t);
  }, []);

  // pipeline 轮询
  useEffect(() => {
    const load = async () => {
      const s = await fetchPipelineStatus();
      if (!s) return;
      setPipelineStage(s.stage);
    };
    void load();
    const interval = setInterval(load, 8_000);
    return () => clearInterval(interval);
  }, []);

  const currentStageIdx = getStageIndex(pipelineStage);

  const handleStepClick = (idx: number) => {
    setExpandedStep(expandedStep === idx ? null : idx);
  };

  return (
    <main className="overview-page">
      {/* ============== 全屏 HERO ============== */}
      <section className={`hero-fullscreen ${heroReady ? 'is-ready' : ''}`}>
        {/* 工业装饰 · 右上 MODULE 铭牌 */}
        <div className="hero-corner-plate">MODULE · 01</div>

        {/* 工业装饰 · 左下编号 */}
        <div className="hero-corner-id">
          EA · 工程认证 · 智能体
        </div>

        <div className="hero-content">
          <div className="hero-kicker">
            <span className="hero-kicker-dot" />
            <span className="hero-kicker-text">M1 · WORKBENCH</span>
            <span className="hero-kicker-divider" />
            <span className="hero-kicker-sub">总览与任务</span>
          </div>

          <h1 className="hero-title">
            实验教学
            <br />
            <span className="hero-title-accent">能力图谱</span>
          </h1>

          <p className="hero-lead">
            从一份教学材料出发，<strong>AI 自动完成</strong>节点提取、关系推断、
            覆盖诊断与改进建议。所有数值可溯源，每一条支撑关系都有材料片段作为证据。
          </p>

          {selectedCourseName && (
            <div className="hero-course-focus">
              当前聚焦：{selectedCourseName} — 切换至其他模块查看该课程详情
            </div>
          )}

          <div className="hero-cta-group">
            <button
              className="hero-cta hero-cta--primary"
              onClick={() => navigate('/resources')}
            >
              <CloudUploadOutlined />
              从上传教学材料开始
              <RightOutlined className="hero-cta-arrow" />
            </button>
            <button
              className="hero-cta hero-cta--ghost"
              onClick={() =>
                document
                  .querySelector('.workflow-stream')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              查看工作流
              <DownOutlined className="hero-cta-arrow" />
            </button>
          </div>

          <div className="hero-meta-row">
            <span className="hero-meta-dot hero-meta-dot--ok" />
            上传后 AI 自动推进，无需手动触发
          </div>
        </div>

        {/* 底部滚动指示 */}
        <div className="hero-scroll-hint">
          <span className="hero-scroll-text">SCROLL</span>
          <span className="hero-scroll-line" />
        </div>
      </section>

      {/* ============== 核心指标（首屏可见） ============== */}
      <section className="overview-metrics-section">
        <div className="overview-metrics-header">
          <div className="overview-metrics-title-group">
            <span className="workflow-bullet" />
            <h2 className="workflow-title">核心指标</h2>
            <span className="workflow-count">Key Metrics</span>
          </div>
          <div className="workflow-meta">REALTIME · 4 METRICS</div>
        </div>
        <OverviewMetrics />
      </section>

      {/* ============== 课程矩阵（专业负责人视角） ============== */}
      <section className="course-matrix-section">
        <div className="workflow-header">
          <div className="workflow-title-group">
            <span className="workflow-bullet" />
            <h2 className="workflow-title">课程矩阵</h2>
            <span className="workflow-count">Course Matrix</span>
          </div>
          <div className="workflow-meta">MATRIX · 10 COURSES × 5 STAGES</div>
        </div>

        <div className="workflow-subtitle">
          每门课程在流水线中的进度一览。点击任意格子可直接跳转到该课程对应模块。
        </div>

        <CourseMatrix />
      </section>

      {/* ============== 动态工作流 ============== */}
      <section className="workflow-stream">
        <div className="workflow-header">
          <div className="workflow-title-group">
            <span className="workflow-bullet" />
            <h2 className="workflow-title">动态工作流</h2>
            <span className="workflow-count">
              {pipelineStage === 'idle'
                ? 'Waiting'
                : pipelineStage === 'done'
                  ? 'Completed'
                  : 'In Progress'}
            </span>
          </div>
          <div className="workflow-meta">PIPELINE · 5 STEPS</div>
        </div>

        <div className="workflow-subtitle">
          {pipelineStage === 'idle'
            ? '上传教学材料后，系统将自动推进整个分析链路'
            : pipelineStage === 'done'
              ? '全流程已完成，可查看诊断报告和改进建议'
              : '系统正在自动推进中，点击任意步骤展开详情'}
        </div>

        {/* 5 步动态流 */}
        <div className="workflow-steps has-progress-line">
          {WORKFLOW_STEPS.map((step, idx) => {
            const stepStageIdx = getStageIndex(step.stageAfter);
            const isDone = currentStageIdx > stepStageIdx;
            const isCurrent =
              currentStageIdx === idx + 1 ||
              (currentStageIdx > 0 &&
                currentStageIdx <= stepStageIdx &&
                idx === currentStageIdx - 1);
            const isExpanded = expandedStep === idx;

            return (
              <div
                key={step.path}
                className={`workflow-step ${isDone ? 'is-done' : ''} ${isCurrent ? 'is-current' : ''} ${isExpanded ? 'is-expanded' : ''}`}
              >
                <div
                  className="workflow-step-header"
                  onClick={() => handleStepClick(idx)}
                >
                  <div className="workflow-step-no">{step.no}</div>
                  <div className="workflow-step-icon">
                    {isDone ? (
                      <CheckCircleFilled />
                    ) : isCurrent ? (
                      <LoadingOutlined />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <div className="workflow-step-body">
                    <div className="workflow-step-title-row">
                      <span className="workflow-step-title">{step.title}</span>
                      {isDone && (
                        <span className="workflow-step-tag workflow-step-tag--done">
                          ✓ 已完成
                        </span>
                      )}
                      {isCurrent && (
                        <span className="workflow-step-tag workflow-step-tag--current">
                          ● 进行中
                        </span>
                      )}
                    </div>
                    <div className="workflow-step-desc">{step.desc}</div>
                  </div>
                  <div
                    className={`workflow-step-chevron ${isExpanded ? 'expanded' : ''}`}
                  >
                    <DownOutlined />
                  </div>
                </div>

                {isExpanded && (
                  <div className="workflow-step-detail">
                    <div className="workflow-step-detail-text">
                      {step.detail}
                    </div>
                    <div className="workflow-step-detail-hint">
                      <span className="workflow-step-hint-label">
                        NEXT ACTION
                      </span>
                      <span className="workflow-step-hint-text">
                        {step.metricHint}
                      </span>
                    </div>
                    <button
                      className="workflow-step-go"
                      onClick={() => navigate(step.path)}
                    >
                      进入 {step.title}
                      <RightOutlined />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </section>
    </main>
  );
}
