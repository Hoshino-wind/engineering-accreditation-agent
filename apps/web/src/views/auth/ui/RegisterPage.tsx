import {
  KeyOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import { Button, Form, Input, Select, Typography, message } from 'antd';
import { useEffect } from 'react';

import { clearAuth, setCachedMe, setToken, type CachedUser } from '../../../shared/auth/authStore';
import { browserEnv } from '../../../shared/config/env';

import './registerPage.css';

const { Link } = Typography;

interface RegisterFormValues {
  username: string;
  password: string;
  confirmPassword: string;
  displayName?: string;
  role: 'teacher' | 'admin';
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

interface RegisterErrorBody {
  detail?: string;
  field?: string;
  message?: string;
}

/** 安全解析错误响应体，失败时返回空对象 */
function readErrorBody(res: Response): Promise<RegisterErrorBody> {
  return res
    .json()
    .then((body: unknown) =>
      body && typeof body === 'object' ? (body as RegisterErrorBody) : {},
    )
    .catch(() => ({}));
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

export function RegisterPage() {
  const [form] = Form.useForm<RegisterFormValues>();
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = '注册 · 工程认证智能体';
    }
  }, []);

  const onFinish = async (values: RegisterFormValues) => {
    const display_name = values.displayName?.trim() || values.username;

    try {
      const baseUrl = browserEnv.VITE_API_BASE_URL;

      // Step 1: 注册拿 access_token
      const regRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: values.username,
          password: values.password,
          display_name,
          role: values.role,
        }),
      });

      if (regRes.status === 409) {
        const err = await readErrorBody(regRes);
        form.setFields([
          {
            name: 'username',
            errors: [err.detail || err.message || '用户名已存在，请更换'],
          },
        ]);
        return;
      }
      if (regRes.status === 400) {
        const err = await readErrorBody(regRes);
        if (err.field) {
          form.setFields([
            {
              name: err.field as keyof RegisterFormValues,
              errors: [err.detail || err.message || '参数错误'],
            },
          ]);
        } else {
          messageApi.error(err.detail || err.message || '参数错误，请检查输入');
        }
        return;
      }
      if (!regRes.ok) {
        const err = await readErrorBody(regRes);
        messageApi.error(err.detail || err.message || `注册失败（${regRes.status}）`);
        return;
      }

      const regData = (await regRes.json()) as AuthTokenResponse;
      const token = regData.access_token;
      if (!token) {
        messageApi.error('注册失败：未收到 access_token');
        return;
      }
      setToken(token);

      // Step 2: 拿 /auth/me
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

      messageApi.success(`注册成功，欢迎 ${me.display_name || me.username}，即将进入工作台`);

      const next = getNextParam();
      setTimeout(() => {
        window.location.replace(next);
      }, 800);
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

            <h1 className="auth-title reveal-item">创建账号</h1>
            <p className="auth-lead reveal-item">
              加入 <strong>能力图谱建设</strong> 试点，开启工程认证智能化协作。
            </p>

            <Form
              form={form}
              layout="vertical"
              requiredMark={false}
              onFinish={onFinish}
              className="auth-form reveal-item"
              autoComplete="off"
              initialValues={{ role: 'teacher' }}
            >
              <Form.Item
                name="username"
                label="用户名"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 3, message: '用户名至少 3 个字符' },
                  { max: 32, message: '用户名不超过 32 个字符' },
                  {
                    pattern: /^[a-zA-Z0-9_-]+$/,
                    message: '用户名仅支持字母、数字、下划线和短横线',
                  },
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="如：wang_teacher"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="密码"
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 6, message: '密码至少 6 位' },
                  { max: 64, message: '密码不超过 64 位' },
                ]}
              >
                <Input.Password
                  prefix={<KeyOutlined />}
                  placeholder="至少 6 位字符"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label="确认密码"
                dependencies={['password']}
                rules={[
                  { required: true, message: '请再次输入密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'));
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<KeyOutlined />}
                  placeholder="再次输入密码"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="displayName"
                label="显示名称（可选）"
                extra={<span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>留空则默认使用用户名</span>}
                rules={[{ max: 32, message: '显示名不超过 32 个字符' }]}
              >
                <Input
                  prefix={<UserSwitchOutlined />}
                  placeholder="如：王老师"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="role"
                label="角色"
                rules={[{ required: true, message: '请选择角色' }]}
              >
                <Select
                  size="large"
                  options={[
                    { value: 'teacher', label: '课任老师' },
                    { value: 'admin', label: '管理员' },
                  ]}
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  className="auth-submit-btn"
                  size="large"
                >
                  注 册
                </Button>
              </Form.Item>
            </Form>

            <div className="auth-footer reveal-item">
              <span>已有账号？</span>
              <Link href="/login">去登录 →</Link>
            </div>
          </div>

          <div className="auth-watermark">v0.1 · MVP</div>
        </div>
      </div>
    </div>
  );
}
