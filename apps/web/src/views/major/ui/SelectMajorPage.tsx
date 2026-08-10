import { BookOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Empty, Spin, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { fetchMajors, type MajorResponse } from '../../../shared/api/majorsClient';
import { getToken } from '../../../shared/auth/authStore';
import {
  getSelectedMajorId,
  setSelectedMajorId,
} from '../../../shared/major/majorStore';

import './selectMajorPage.css';

const { Paragraph, Title } = Typography;

export function SelectMajorPage() {
  const [majors, setMajors] = useState<MajorResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);

  // 未登录则重定向到登录页
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!getToken()) {
      window.location.replace('/login');
      return;
    }

    // 加载专业列表
    void (async () => {
      setLoading(true);
      const data = await fetchMajors();
      if (data === null) {
        setMajors([]);
        setLoadFailed(true);
        setLoading(false);
        return;
      }
      setLoadFailed(false);
      if (data) {
        setMajors(data);
        // 只有从登录后首次进入（?auto=true）且只有一个专业时，才自动绑定并跳转，
        // 避免用户点击“切换专业”时被直接闪回首页。
        const params = new URLSearchParams(window.location.search);
        const shouldAutoSelect = params.get('auto') === 'true';
        if (shouldAutoSelect && data.length === 1 && data[0]) {
          setSelectedMajorId(data[0].id);
          window.location.replace(params.get('next') || '/');
          return;
        }
      }
      setLoading(false);
    })();
  }, []);

  const handleSelect = (major: MajorResponse) => {
    setSubmitting(major.id);
    setSelectedMajorId(major.id);
    // 短暂延迟让用户看到选中反馈
    setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next') || '/';
      window.location.replace(next);
    }, 260);
  };

  const selectedId = getSelectedMajorId();

  return (
    <div className="select-major-page">
      <div className="select-major-card">
        <div className="select-major-brand">
          <div className="select-major-brand-mark">
            <SafetyCertificateOutlined aria-hidden />
          </div>
          <div className="select-major-brand-texts">
            <div className="select-major-brand-title">工程认证智能体</div>
            <div className="select-major-brand-subtitle">Accreditation Graph</div>
          </div>
        </div>

        <Title level={3} className="select-major-title">
          选择专业
        </Title>
        <Paragraph className="select-major-lead">
          请先选择当前要进行工程认证的专业。后续的课程、能力图谱与达成度评价都会围绕该专业展开。
        </Paragraph>

        {loading ? (
          <div className="select-major-loading">
            <Spin size="large" />
            <span>正在加载专业列表…</span>
          </div>
        ) : loadFailed ? (
          <div className="select-major-empty">
            <Alert
              type="error"
              showIcon
              message="专业列表加载失败"
              description="请确认后端服务已启动，或重新登录后再试。"
            />
            <Button
              type="primary"
              className="select-major-retry"
              onClick={() => window.location.reload()}
            >
              刷新重试
            </Button>
            <Button
              className="select-major-retry"
              onClick={() => window.location.replace('/login')}
            >
              重新登录
            </Button>
          </div>
        ) : majors.length === 0 ? (
          <div className="select-major-empty">
            <Empty
              description={
                <span>
                  暂无可用专业
                  <br />
                  请联系管理员先在后台添加专业
                </span>
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
            <Button
              type="primary"
              className="select-major-retry"
              onClick={() => window.location.reload()}
            >
              刷新重试
            </Button>
          </div>
        ) : (
          <div className="select-major-grid">
            {majors.map((major) => (
              <Card
                key={major.id}
                className={`select-major-item${
                  selectedId === major.id ? ' select-major-item--active' : ''
                }`}
                onClick={() => handleSelect(major)}
              >
                <div className="select-major-item-icon">
                  <BookOutlined />
                </div>
                <div className="select-major-item-info">
                  <div className="select-major-item-name">{major.name}</div>
                  <div className="select-major-item-meta">
                    {major.schoolName && `${major.schoolName} · `}
                    {major.code}
                  </div>
                  {major.description && (
                    <div className="select-major-item-desc">{major.description}</div>
                  )}
                </div>
                <Button
                  type={selectedId === major.id ? 'primary' : 'default'}
                  loading={submitting === major.id}
                  className="select-major-item-btn"
                >
                  {selectedId === major.id ? '当前选择' : '选择'}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
