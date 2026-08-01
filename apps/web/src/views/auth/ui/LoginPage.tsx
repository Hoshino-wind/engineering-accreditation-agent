import { LockOutlined, SafetyCertificateOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Form, Input, Typography, message } from 'antd';
import { useEffect } from 'react';

import { clearAuth, setCachedMe, setToken, type CachedUser } from '../../../shared/auth/authStore';
import { browserEnv } from '../../../shared/config/env';

import './loginPage.css';

const { Link } = Typography;

interface LoginFormValues {
  username: string;
  password: string;
}

interface AuthTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

interface MeResponse {
  id: string;
  username: string;
  display_name: string;
  role: string;
  avatar_url?: string | null;
  created_at?: string;
}

function getNextParam(): string {
  if (typeof window === 'undefined') return '/';
  const params = new URLSearchParams(window.location.search);
  return params.get('next') || '/';
}

function toCachedUser(me: MeResponse): CachedUser {
  return {
    id: me.id,
    username: me.username,
    displayName: me.display_name,
    role: me.role,
    avatarUrl: me.avatar_url ?? undefined,
  };
}

export function LoginPage() {
  const [form] = Form.useForm<LoginFormValues>();
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = '登录 · 工程认证智能体';
    }
  }, []);

  const onFinish = async (values: LoginFormValues) => {
    try {
      const baseUrl = browserEnv.VITE_API_BASE_URL;

      // Step 1: 登录拿 access_token
      const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: values.username,
          password: values.password,
        }),
      });

      if (loginRes.status === 401) {
        const err = await loginRes.json().catch(() => ({} as any));
        form.setFields([
          {
            name: 'password',
            errors: [err?.detail || err?.message || '用户名或密码错误'],
          },
        ]);
        return;
      }
      if (!loginRes.ok) {
        const err = await loginRes.json().catch(() => ({} as any));
        messageApi.error(err?.detail || err?.message || `登录失败（${loginRes.status}）`);
        return;
      }

      const loginData = (await loginRes.json()) as AuthTokenResponse;
      const token = loginData.access_token;
      if (!token) {
        messageApi.error('登录失败：未收到 access_token');
        return;
      }
      setToken(token);

      // Step 2: 用 token 调 /auth/me 拿用户信息
      const meRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!meRes.ok) {
        clearAuth();
        messageApi.error('获取用户信息失败，请重新登录');
        return;
      }
      const me = (await meRes.json()) as MeResponse;
      setCachedMe(toCachedUser(me));

      messageApi.success(`欢迎回来，${me.display_name || me.username}`);

      // Step 3: 跳转到 next 或首页
      const next = getNextParam();
      window.location.replace(next);
    } catch (err) {
      messageApi.error(
        err instanceof Error ? `网络错误：${err.message}` : '网络错误，请稍后重试',
      );
    }
  };

  return (
    <div className="auth-page">
      {contextHolder}
      <div className="auth-card-wrap reveal-group is-ready">
        <div className="auth-card">
          <div className="auth-card-inner">
            <div className="auth-brand reveal-item">
              <div className="auth-brand-mark">
                <SafetyCertificateOutlined aria-hidden />
              </div>
              <div className="auth-brand-texts">
                <div className="auth-brand-title">工程认证智能体</div>
                <div className="auth-brand-subtitle">Accreditation Graph</div>
              </div>
            </div>

            <h1 className="auth-title reveal-item">欢迎回来</h1>
            <p className="auth-lead reveal-item">
              登录以继续使用 <strong>能力图谱</strong> 与 <strong>达成度评价</strong> 工作台。
            </p>

            <Form
              form={form}
              layout="vertical"
              requiredMark={false}
              onFinish={onFinish}
              className="auth-form reveal-item"
              autoComplete="off"
            >
              <Form.Item
                name="username"
                label="用户名"
                rules={[{ required: true, message: '请输入用户名' }]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="请输入用户名"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="密码"
                rules={[{ required: true, message: '请输入密码' }]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="请输入密码"
                  size="large"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  className="auth-submit-btn"
                  size="large"
                >
                  登 录
                </Button>
              </Form.Item>
            </Form>

            <div className="auth-divider reveal-item">
              <div className="auth-divider-line" />
              <span className="auth-divider-text">试点账号</span>
              <div className="auth-divider-line" />
            </div>

            <div className="auth-hint-box reveal-item">
              <div className="auth-hint-title">
                <SafetyCertificateOutlined />
                MVP 阶段演示账号
              </div>
              <ul className="auth-hint-list">
                <li className="auth-hint-item">
                  admin<span>/</span>admin123
                </li>
                <li className="auth-hint-item">
                  wang<span>/</span>123456
                </li>
                <li className="auth-hint-item">
                  li<span>/</span>123456
                </li>
              </ul>
            </div>

            <div className="auth-footer reveal-item">
              <span>新老师？</span>
              <Link href="/register">去注册 →</Link>
            </div>
          </div>

          <div className="auth-watermark">v0.1 · MVP</div>
        </div>
      </div>
    </div>
  );
}
