import { ArrowRightOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import {
  type PipelineStage,
  fetchPipelineStatus,
} from '../../../shared/api/pipelineClient';

import './nextStepBanner.css';

interface BannerConfig {
  message: string;
  cta: string;
  path: string;
  tone: 'info' | 'success' | 'warning';
}

const STAGE_BANNERS: Record<PipelineStage, BannerConfig | null> = {
  idle: {
    message: '还没有教学材料，先上传一份培养方案或实验指导书开始',
    cta: '去上传',
    path: '/resources',
    tone: 'info',
  },
  uploading: {
    message: '材料已上传，系统正在处理中',
    cta: '查看资源',
    path: '/resources',
    tone: 'info',
  },
  extracting: {
    message: 'AI 正在从材料中提取能力节点和支撑关系',
    cta: '去图谱看看',
    path: '/graph',
    tone: 'info',
  },
  reviewing: {
    message: '有新的映射关系待审核确认',
    cta: '去审核',
    path: '/recognition',
    tone: 'warning',
  },
  diagnosing: {
    message: '正在分析覆盖缺口和材料一致性',
    cta: '查看诊断',
    path: '/diagnostics',
    tone: 'info',
  },
  done: {
    message: '全流程已完成，查看改进建议闭环',
    cta: '去改进',
    path: '/improvements',
    tone: 'success',
  },
};

interface NextStepBannerProps {
  /** 当前页面路径，用于避免在当前页面显示跳转到自己的 banner */
  currentPath: string;
  /** 可选的自定义 override */
  override?: BannerConfig;
}

export function NextStepBanner({ currentPath, override }: NextStepBannerProps) {
  const [banner, setBanner] = useState<BannerConfig | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const status = await fetchPipelineStatus();
      if (!status) return;

      // 根据当前页面 + pipeline stage 决定显示什么 banner
      let config = override ?? STAGE_BANNERS[status.stage];

      // 如果 banner 指向的页面就是当前页面，不显示
      if (config && config.path === currentPath) {
        config = null;
      }

      // 当前图谱中的待审核 SUPPORTS 边是唯一业务真源，统一在图谱页处理。
      if (status.pendingReviewCount > 0 && currentPath !== '/graph') {
        config = {
          message: `${status.pendingReviewCount} 条 AI 推断的支撑关系待审核`,
          cta: '去图谱审核',
          path: '/graph',
          tone: 'warning',
        };
      }

      // 有 gap 时提示改进
      if (status.gapCount > 0 && status.stage === 'done' && currentPath !== '/improvements') {
        config = {
          message: `发现 ${status.gapCount} 个覆盖缺口，已生成 ${status.suggestionCount} 条改进建议`,
          cta: '查看建议',
          path: '/improvements',
          tone: 'success',
        };
      }

      setBanner(config);
    };

    void load();
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, [currentPath, override]);

  if (!banner) return null;

  return (
    <div className={`next-step-banner next-step-banner--${banner.tone}`}>
      <span className="next-step-banner-message">{banner.message}</span>
      <button
        className="next-step-banner-cta"
        onClick={() => navigate(banner.path)}
      >
        {banner.cta}
        <ArrowRightOutlined style={{ fontSize: 11, marginLeft: 4 }} />
      </button>
    </div>
  );
}
