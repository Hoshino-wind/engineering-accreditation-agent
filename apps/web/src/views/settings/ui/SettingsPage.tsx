import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Divider,
  Input,
  Select,
  Space,
  Spin,
  Typography,
  message,
} from 'antd';
import { ApiOutlined, DatabaseOutlined, SafetyCertificateOutlined } from '@ant-design/icons';

import {
  fetchLLMModels,
  getLLMSettings,
  saveLLMSettings,
  testLLMConnection,
  type LLMSettings,
  type ModelsResult,
  type ProviderInput,
  type TestResult,
} from '../../../shared/api/llmSettings';

const { Title, Paragraph, Text } = Typography;

/** 从字段值计算写入入参的 apiKey：与原始掩码相同 → 保留原值(null)；否则用当前值。 */
function resolveApiKey(fieldValue: string, originalMask: string | null): string | null {
  if (fieldValue === originalMask) return null;
  return fieldValue;
}

function ProviderSection(props: {
  title: string;
  hint: string;
  vendor: string;
  setVendor: (v: string) => void;
  apiKey: string;
  setApiKey: (k: string) => void;
  baseUrl: string;
  setBaseUrl: (u: string) => void;
  model: string;
  setModel: (m: string) => void;
  vendors: LLMSettings['vendors'];
  originalMask: string | null;
}) {
  const {
    title,
    hint,
    vendor,
    setVendor,
    apiKey,
    setApiKey,
    baseUrl,
    setBaseUrl,
    model,
    setModel,
    vendors,
    originalMask,
  } = props;

  const [fetchingModels, setFetchingModels] = useState(false);
  const [modelList, setModelList] = useState<string[] | null>(null);
  const [modelFetchError, setModelFetchError] = useState<string | null>(null);

  const preset = vendors[vendor];
  const modelOptions = preset?.models ?? [];

  const onVendorChange = (v: string) => {
    setVendor(v);
    const p = vendors[v];
    if (p?.base_url) setBaseUrl(p.base_url);
    if (p?.models?.length && !p.models.includes(model)) {
      setModel(p.models[0]!);
    }
  };

  const handleFetchModels = async () => {
    setFetchingModels(true);
    setModelFetchError(null);
    try {
      const res: ModelsResult = await fetchLLMModels({
        vendor,
        apiKey: resolveApiKey(apiKey, originalMask),
        baseUrl,
        model,
      });
      if (res.ok) {
        setModelList(res.models);
        message.success(`读取到 ${res.models.length} 个可用模型`);
      } else {
        setModelList(null);
        setModelFetchError(res.error ?? '获取失败');
        message.error(res.error ?? '获取模型列表失败');
      }
    } catch (e) {
      setModelList(null);
      setModelFetchError((e as Error).message);
      message.error((e as Error).message);
    } finally {
      setFetchingModels(false);
    }
  };

  return (
    <Card
      size="small"
      title={
        <Space>
          <ApiOutlined />
          {title}
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      <Paragraph type="secondary" style={{ marginBottom: 12 }}>
        {hint}
      </Paragraph>

      <div style={{ marginBottom: 12 }}>
        <Text strong>厂商</Text>
        <Select
          value={vendor}
          onChange={onVendorChange}
          style={{ width: '100%', marginTop: 6 }}
          options={Object.entries(vendors).map(([key, v]) => ({
            value: key,
            label: v.label,
          }))}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <Text strong>API Key</Text>
        <Input.Password
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="选择厂商后，只需在此粘贴 API Key"
          style={{ marginTop: 6 }}
          autoComplete="off"
        />
        <Paragraph type="secondary" style={{ margin: '4px 0 0', fontSize: 12 }}>
          留空且未修改则保留已有 Key；要清空请主动删空后保存。
        </Paragraph>
      </div>

      <div style={{ marginBottom: 12 }}>
        <Text strong>Base URL</Text>
        <Input
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://..."
          style={{ marginTop: 6 }}
        />
      </div>

      <div style={{ marginBottom: 4 }}>
        <Text strong>模型名称</Text>
        <Input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="如 deepseek-chat"
          style={{ marginTop: 6 }}
        />
        {modelOptions.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              快捷选择：
            </Text>
            {modelOptions.map((m) => (
              <Button
                key={m}
                size="small"
                type="dashed"
                onClick={() => setModel(m)}
              >
                {m}
              </Button>
            ))}
          </div>
        )}

        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <Button
            size="small"
            loading={fetchingModels}
            onClick={handleFetchModels}
            icon={<DatabaseOutlined />}
          >
            读取模型
          </Button>
          {modelList && modelList.length > 0 && (
            <Select
              value={model || undefined}
              onChange={setModel}
              showSearch
              style={{ minWidth: 280 }}
              placeholder="从可用模型中选择"
              options={modelList.map((m) => ({ value: m, label: m }))}
            />
          )}
        </div>
        {modelFetchError && (
          <div style={{ marginTop: 6 }}>
            <Text type="danger" style={{ fontSize: 12 }}>
              读取失败：{modelFetchError}
            </Text>
          </div>
        )}
        <Paragraph type="secondary" style={{ margin: '6px 0 0', fontSize: 12 }}>
          点「读取模型」会用当前填写的 Key 向该厂商接口查询你账号下可用的模型，自动列出供选择。
        </Paragraph>
      </div>
    </Card>
  );
}

export function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<LLMSettings | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const [chatVendor, setChatVendor] = useState('custom');
  const [chatKey, setChatKey] = useState('');
  const [chatBaseUrl, setChatBaseUrl] = useState('');
  const [chatModel, setChatModel] = useState('');

  const [embVendor, setEmbVendor] = useState('custom');
  const [embKey, setEmbKey] = useState('');
  const [embBaseUrl, setEmbBaseUrl] = useState('');
  const [embModel, setEmbModel] = useState('');

  const origChatMask = useRef<string | null>(null);
  const origEmbMask = useRef<string | null>(null);

  useEffect(() => {
    getLLMSettings()
      .then((s) => {
        setSettings(s);
        origChatMask.current = s.chat.apiKeyMasked;
        origEmbMask.current = s.embedding.apiKeyMasked;
        setChatVendor(s.chat.vendor);
        setChatKey(s.chat.apiKeyMasked ?? '');
        setChatBaseUrl(s.chat.baseUrl);
        setChatModel(s.chat.model);
        setEmbVendor(s.embedding.vendor);
        setEmbKey(s.embedding.apiKeyMasked ?? '');
        setEmbBaseUrl(s.embedding.baseUrl);
        setEmbModel(s.embedding.model);
      })
      .catch((e) => message.error((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const buildChatInput = (): ProviderInput => ({
    vendor: chatVendor,
    apiKey: resolveApiKey(chatKey, origChatMask.current),
    baseUrl: chatBaseUrl,
    model: chatModel,
  });

  const buildEmbInput = (): ProviderInput => ({
    vendor: embVendor,
    apiKey: resolveApiKey(embKey, origEmbMask.current),
    baseUrl: embBaseUrl,
    model: embModel,
  });

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);
    try {
      const updated = await saveLLMSettings({
        chat: buildChatInput(),
        embedding: buildEmbInput(),
      });
      setSettings(updated);
      origChatMask.current = updated.chat.apiKeyMasked;
      origEmbMask.current = updated.embedding.apiKeyMasked;
      setChatVendor(updated.chat.vendor);
      setChatKey(updated.chat.apiKeyMasked ?? '');
      setChatBaseUrl(updated.chat.baseUrl);
      setChatModel(updated.chat.model);
      setEmbVendor(updated.embedding.vendor);
      setEmbKey(updated.embedding.apiKeyMasked ?? '');
      setEmbBaseUrl(updated.embedding.baseUrl);
      setEmbModel(updated.embedding.model);
      message.success('模型设置已保存，立即生效（无需重启）');
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await testLLMConnection({
        chat: buildChatInput(),
        embedding: buildEmbInput(),
      });
      setTestResult(r);
      if (r.ok) message.success(`连接成功（模型 ${r.model}）`);
      else message.error(`连接失败：${r.error ?? '未知错误'}`);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setTesting(false);
    }
  };

  if (loading || !settings) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spin />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '8px 4px' }}>
      <Title level={3} style={{ marginBottom: 4 }}>
        模型设置
      </Title>
      <Paragraph type="secondary">
        在此配置大模型提供方与 API Key，覆盖后端 <Text code>.env</Text> 中的 LLM 配置，
        保存后立即生效，无需重启服务。配置仅保存在服务器本地（<Text code>apps/api/data/llm_settings.json</Text>，已被 gitignore 忽略）。
      </Paragraph>

      {settings.isConfigured ? (
        <Alert
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
          message={`已配置：当前对话模型 ${settings.chat.model || '未指定'}，AI 功能可用`}
        />
      ) : (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="尚未配置 API Key，AI 功能将以 Mock 模式运行（仍可体验完整流程）"
        />
      )}

      <ProviderSection
        title="对话 / 生成模型"
        hint="用于节点提取、关系推理、诊断叙述、改进建议、报告生成等。选厂商会自动填好 Base URL 与默认模型，你只需粘贴 Key。"
        vendor={chatVendor}
        setVendor={setChatVendor}
        apiKey={chatKey}
        setApiKey={setChatKey}
        baseUrl={chatBaseUrl}
        setBaseUrl={setChatBaseUrl}
        model={chatModel}
        setModel={setChatModel}
        vendors={settings.vendors}
        originalMask={origChatMask.current}
      />

      <ProviderSection
        title="Embedding 模型（可选）"
        hint="仅在使用向量检索（RAG）时需要。多数情况下可与对话模型选同一厂商；无 Embedding 能力的厂商（如 DeepSeek）可单独选 OpenAI / SiliconFlow / Ollama 等。"
        vendor={embVendor}
        setVendor={setEmbVendor}
        apiKey={embKey}
        setApiKey={setEmbKey}
        baseUrl={embBaseUrl}
        setBaseUrl={setEmbBaseUrl}
        model={embModel}
        setModel={setEmbModel}
        vendors={settings.vendors}
        originalMask={origEmbMask.current}
      />

      <Divider />

      <Space>
        <Button
          type="primary"
          loading={saving}
          onClick={handleSave}
          icon={<SafetyCertificateOutlined />}
        >
          保存设置
        </Button>
        <Button loading={testing} onClick={handleTest}>
          测试链接
        </Button>
      </Space>

      {testResult && (
        <Alert
          style={{ marginTop: 16 }}
          type={testResult.ok ? 'success' : 'error'}
          showIcon
          message={testResult.ok ? '连接成功' : '连接失败'}
          description={
            testResult.ok
              ? `模型 ${testResult.model} 返回 200`
              : testResult.error ?? `HTTP ${testResult.status}`
          }
        />
      )}
    </div>
  );
}
