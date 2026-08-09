import { ArrowRightOutlined, CloudUploadOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';

import './EmptyStateGuide.css';

export interface EmptyStateGuideProps {
  /** 主标题，如"还没有图谱数据" */
  title: string;
  /** 描述，如"先上传一份培养方案，AI 会自动提取节点构建图谱" */
  description: string;
  /** CTA 按钮文字，如"去上传材料" */
  ctaText: string;
  /** CTA 跳转路径，如"/resources" */
  ctaPath: string;
  /** 可选：图标，默认用 CloudUploadOutlined */
  icon?: ReactNode;
}

/**
 * 空状态牵引组件。
 * 在页面无数据时，引导用户先去上传材料 / 完成前置流程。
 */
export function EmptyStateGuide({
  title,
  description,
  ctaText,
  ctaPath,
  icon,
}: EmptyStateGuideProps) {
  const navigate = useNavigate();

  return (
    <div className="empty-state-guide">
      <div className="empty-state-guide-icon">
        {icon ?? <CloudUploadOutlined />}
      </div>
      <h3 className="empty-state-guide-title">{title}</h3>
      <p className="empty-state-guide-desc">{description}</p>
      <Button
        type="primary"
        size="large"
        className="empty-state-guide-cta"
        icon={<ArrowRightOutlined />}
        iconPosition="end"
        onClick={() => navigate(ctaPath)}
      >
        {ctaText}
      </Button>
    </div>
  );
}
