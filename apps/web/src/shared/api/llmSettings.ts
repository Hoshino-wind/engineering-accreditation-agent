// LLM 模型设置接口封装（页面可配置 API Key，覆盖 .env，运行时生效）
// 后端路由：/api/v1/settings/llm  （GET 读取 / PUT 保存 / POST /test 测试连通性）
// 鉴权与 X-Major-Id 注入统一由 apiFetch 负责（此处 skipMajorId，因为模型配置按用户隔离，由登录 token 识别，不与专业绑定）

import { browserEnv } from '../config/env';
import { apiFetch } from './apiClient';

const SETTINGS_BASE = `${browserEnv.VITE_API_BASE_URL}/api/v1/settings/llm`;

export interface VendorPreset {
  label: string;
  base_url: string;
  models: string[];
  supports_embedding: boolean;
}

export interface ProviderConfig {
  vendor: string;
  api_key_set: boolean;
  api_key_masked: string | null;
  base_url: string;
  model: string;
}

export interface LLMSettings {
  chat: ProviderConfig;
  embedding: ProviderConfig;
  is_configured: boolean;
  vendors: Record<string, VendorPreset>;
}

/** 单个提供方（对话 / embedding）的写入入参。 */
export interface ProviderInput {
  vendor: string;
  // api_key 语义：null=保留原值；""=清空；非空=覆盖
  api_key: string | null;
  base_url: string;
  model: string;
}

export interface SettingsUpdate {
  chat: ProviderInput;
  embedding: ProviderInput;
}

export interface TestResult {
  ok: boolean;
  status?: number;
  model?: string;
  error?: string;
}

/** POST /settings/llm/models 的返回：该 key 可用的模型列表。 */
export interface ModelsResult {
  ok: boolean;
  models: string[];
  error?: string;
}

export async function getLLMSettings(): Promise<LLMSettings> {
  const resp = await apiFetch(SETTINGS_BASE, { method: 'GET', skipMajorId: true });
  if (!resp.ok) {
    throw new Error(`获取模型设置失败：${resp.status}`);
  }
  return (await resp.json()) as LLMSettings;
}

export async function saveLLMSettings(body: SettingsUpdate): Promise<LLMSettings> {
  const resp = await apiFetch(SETTINGS_BASE, {
    method: 'PUT',
    skipMajorId: true,
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(text || `保存失败：${resp.status}`);
  }
  return (await resp.json()) as LLMSettings;
}

export async function testLLMConnection(body: SettingsUpdate): Promise<TestResult> {
  const resp = await apiFetch(`${SETTINGS_BASE}/test`, {
    method: 'POST',
    skipMajorId: true,
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(text || `测试失败：${resp.status}`);
  }
  return (await resp.json()) as TestResult;
}

/** 读取当前 key 在该厂商下可用的模型列表（单提供方入参）。 */
export async function fetchLLMModels(body: ProviderInput): Promise<ModelsResult> {
  const resp = await apiFetch(`${SETTINGS_BASE}/models`, {
    method: 'POST',
    skipMajorId: true,
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(text || `获取模型列表失败：${resp.status}`);
  }
  return (await resp.json()) as ModelsResult;
}
