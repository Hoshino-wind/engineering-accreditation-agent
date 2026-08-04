import {
  DeleteOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  message,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';

import {
  MaterialStatusTag,
  prototypeOnlyUploadedMaterials,
  type UploadedMaterial,
  type UploadedMaterialCategory,
} from '../../../entities/uploaded-material';
import {
  ExtractionPreview,
  useExtractionTask,
  type ExtractedNode,
} from '../../../features/extract-nodes';
import { UploadDropzone } from '../../../features/upload-material';
import {
  getAcademicCatalog,
  type AcademicCatalog,
} from '../../../shared/api/academicClient';
import {
  getOcrRuntimeStatus,
  listMaterialVersions,
  listUploadedMaterials,
  parseUploadedMaterial,
  uploadMaterialFile,
  type MaterialParseApiResponse,
  type MaterialVersionApiResponse,
  type OcrRuntimeStatus,
  type ParsedMaterialNodeResponse,
} from '../../../shared/api/materialsClient';
import { TeachingResourceSummary } from '../../../widgets/teaching-resource-summary';
import { TeachingResourceWorkbench } from '../../../widgets/teaching-resource-workbench';

import './teachingResourcesPage.css';

const { Paragraph, Text, Title } = Typography;

const fileTypeLabel: Record<string, string> = {
  docx: 'DOCX',
  pdf: 'PDF',
  txt: 'TXT',
  xlsx: 'XLSX',
};

export function TeachingResourcesPage() {
  const [uploadedMaterials, setUploadedMaterials] = useState<UploadedMaterial[]>([]);
  const [catalog, setCatalog] = useState<AcademicCatalog | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<OcrRuntimeStatus | null>(null);
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [versionMaterial, setVersionMaterial] = useState<UploadedMaterial | null>(null);
  const [versions, setVersions] = useState<MaterialVersionApiResponse[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [analyzingMaterialId, setAnalyzingMaterialId] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<MaterialParseApiResponse | null>(null);
  const extraction = useExtractionTask();

  useEffect(() => {
    setLoadingCatalog(true);
    void getAcademicCatalog()
      .then(setCatalog)
      .catch(() => setCatalog(null))
      .finally(() => setLoadingCatalog(false));

    void refreshMaterials(setUploadedMaterials);
    void getOcrRuntimeStatus()
      .then(setOcrStatus)
      .catch(() =>
        setOcrStatus({
          available: false,
          engine: 'tesseract',
          languages: [],
          message: 'OCR status service is unavailable.',
          status: 'unknown',
          version: null,
        }),
      );
  }, []);

  const materials = useMemo(
    () => mergeMaterials(uploadedMaterials, prototypeOnlyUploadedMaterials),
    [uploadedMaterials],
  );

  const courseOptions = useMemo(
    () =>
      (catalog?.courses ?? []).map((course) => ({
        label: `${course.name} (${course.code})`,
        value: course.name,
      })),
    [catalog],
  );

  const handleUpload = async (
    file: File,
    category: UploadedMaterialCategory,
    course?: string,
  ) => {
    const uploaded = await uploadMaterialFile(file, category, course);
    setUploadedMaterials((prev) => mergeMaterials([uploaded], prev));
    message.success(`${file.name} 已上传，可点击“提取”生成待审核关系`);
  };

  const handleStartExtract = (record: UploadedMaterial) => {
    setDrawerOpen(true);
    void extraction.startExtraction(record).then(() => {
      void refreshMaterials(setUploadedMaterials);
    });
  };

  const handleConfirmExtract = (nodes: ExtractedNode[]) => {
    const materialId = extraction.material?.id;
    if (materialId) {
      setUploadedMaterials((prev) =>
        prev.map((item) =>
          item.id === materialId
            ? { ...item, extractedNodeCount: nodes.length, status: 'extracted' }
            : item,
        ),
      );
      message.success(`${nodes.length} 个节点已确认，候选关系已进入 M4 审核队列`);
    }
    setDrawerOpen(false);
    extraction.reset();
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    extraction.reset();
  };

  const handleRunAutopilot = async (record: UploadedMaterial) => {
    if (!record.id.startsWith('material-')) {
      message.info('示例材料只用于页面展示，请先上传真实材料后再进行 AI 分析');
      return;
    }
    setAnalyzingMaterialId(record.id);
    try {
      const result = await parseUploadedMaterial(record.id);
      message.success(
        `AI 分析完成：提取 ${result.extractedNodes.length} 个节点，生成 ${result.candidatesCreated} 条待审核关系`,
      );
      setAnalysisResult(result);
      void refreshMaterials(setUploadedMaterials);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'AI 分析失败，请稍后重试';
      message.error(msg);
    } finally {
      setAnalyzingMaterialId(null);
    }
  };

  const handleDelete = (record: UploadedMaterial) => {
    setUploadedMaterials((prev) => prev.filter((item) => item.id !== record.id));
    message.success(`${record.fileName} 已从当前列表移除`);
  };

  const handleOpenVersions = async (record: UploadedMaterial) => {
    setVersionMaterial(record);
    setVersionModalOpen(true);
    setLoadingVersions(true);
    try {
      setVersions(await listMaterialVersions(record.id));
    } catch {
      setVersions([]);
      message.warning('该材料暂无可查看的版本记录');
    } finally {
      setLoadingVersions(false);
    }
  };

  const columns: ColumnsType<UploadedMaterial> = [
    {
      title: '文件名',
      dataIndex: 'fileName',
      key: 'fileName',
      ellipsis: true,
      width: 280,
    },
    {
      title: '格式',
      dataIndex: 'fileType',
      key: 'fileType',
      width: 70,
      render: (type: string) => <Tag>{fileTypeLabel[type] ?? type}</Tag>,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 110,
    },
    {
      title: '所属课程',
      dataIndex: 'course',
      key: 'course',
      ellipsis: true,
      width: 160,
      render: (course?: string) => course || '--',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: UploadedMaterial['status']) => (
        <MaterialStatusTag status={status} />
      ),
    },
    {
      title: '解析策略',
      dataIndex: 'parseStrategy',
      key: 'parseStrategy',
      width: 130,
      render: (value?: string) => value || '--',
    },
    {
      title: '节点',
      dataIndex: 'extractedNodeCount',
      key: 'extractedNodeCount',
      width: 80,
      render: (count?: number) => (count != null ? `${count} 个` : '--'),
    },
    {
      title: '上传时间',
      dataIndex: 'uploadTime',
      key: 'uploadTime',
      width: 150,
    },
    {
      title: '操作',
      key: 'action',
      width: 340,
      render: (_, record) => {
        const analyzing = analyzingMaterialId === record.id;
        return (
          <Space size={4} wrap>
            <Button
              icon={<ThunderboltOutlined />}
              loading={analyzing}
              onClick={() => handleRunAutopilot(record)}
              size="small"
              type="primary"
            >
              {analyzing ? '分析中' : 'AI 分析'}
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => handleStartExtract(record)}
              size="small"
              type="link"
            >
              提取
            </Button>
            <Button
              icon={<EyeOutlined />}
              onClick={() => handleOpenVersions(record)}
              size="small"
              type="link"
            >
              版本
            </Button>
            <Popconfirm
              onConfirm={() => handleDelete(record)}
              title="确认从当前列表移除该材料？"
            >
              <Button danger icon={<DeleteOutlined />} size="small" type="link">
                删除
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const versionColumns: ColumnsType<MaterialVersionApiResponse> = [
    {
      title: '版本',
      dataIndex: 'versionNo',
      key: 'versionNo',
      width: 70,
      render: (value: number) => <Tag color="blue">v{value}</Tag>,
    },
    {
      title: '文件',
      dataIndex: 'fileName',
      key: 'fileName',
      ellipsis: true,
    },
    {
      title: '大小',
      dataIndex: 'fileSize',
      key: 'fileSize',
      width: 90,
    },
    {
      title: '解析',
      dataIndex: 'parseStrategy',
      key: 'parseStrategy',
      width: 140,
      render: (value?: string) => value || '--',
    },
    {
      title: '表格',
      key: 'tableCount',
      width: 80,
      render: (_, record) => `${extractionNumber(record, 'tableCount')} 个`,
    },
    {
      title: 'OCR',
      key: 'ocr',
      width: 110,
      render: (_, record) => ocrTag(record),
    },
    {
      title: '校验值',
      dataIndex: 'checksum',
      key: 'checksum',
      ellipsis: true,
      render: (value: string) => (
        <Tooltip title={value}>
          <Text code>{value.slice(0, 16)}</Text>
        </Tooltip>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
    },
  ];

  const analysisNodeColumns: ColumnsType<ParsedMaterialNodeResponse> = [
    {
      title: '编码',
      dataIndex: 'code',
      key: 'code',
      width: 110,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: '类型',
      dataIndex: 'kind',
      key: 'kind',
      width: 110,
      render: (value: string) => <Tag>{value}</Tag>,
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      key: 'confidence',
      width: 90,
      render: (value: number) => `${Math.round(value * 100)}%`,
    },
  ];

  return (
    <main className="teaching-resources-page">
      <div className="teaching-resources-page-header">
        <div>
          <Space align="center" size={10}>
            <Title level={2}>教学资源与材料</Title>
            <Tag color="geekblue">M3 教学资源</Tag>
            <Tag color="green">真实上传解析</Tag>
          </Space>
          <Paragraph type="secondary">
            上传培养方案、课程大纲、实验指导书和评分表，系统解析后生成待教师审核的图谱候选关系。
          </Paragraph>
        </div>
      </div>

      <Alert
        className="teaching-resources-notice"
        description={ocrDescription(ocrStatus)}
        icon={<InfoCircleOutlined />}
        showIcon
        title="材料解析与 OCR 环境"
        type={ocrStatus?.available ? 'success' : 'warning'}
      />

      <Card className="teaching-resources-upload-card" size="small">
        <UploadDropzone
          courseOptions={courseOptions}
          loadingCourses={loadingCatalog}
          onUpload={handleUpload}
        />
      </Card>

      <Card
        className="teaching-resources-table-card"
        size="small"
        title={`材料列表（${materials.length} 份）`}
      >
        <Table
          columns={columns}
          dataSource={materials}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          rowKey="id"
          size="small"
        />
      </Card>

      <TeachingResourceSummary />
      <TeachingResourceWorkbench />

      <ExtractionPreview
        material={extraction.material}
        nodes={extraction.nodes}
        model={extraction.model}
        usage={extraction.usage}
        latency={extraction.latency}
        onClose={handleCloseDrawer}
        onConfirm={handleConfirmExtract}
        onSelectAll={extraction.selectAll}
        onToggleNode={extraction.toggleNode}
        open={drawerOpen}
        selectedCount={extraction.selectedCount}
        status={extraction.status}
      />

      <Modal
        destroyOnClose
        footer={
          <Button onClick={() => setAnalysisResult(null)} type="primary">
            知道了
          </Button>
        }
        onCancel={() => setAnalysisResult(null)}
        open={Boolean(analysisResult)}
        title="AI 分析结果"
        width={900}
      >
        {analysisResult && (
          <>
            <Descriptions column={3} size="small">
              <Descriptions.Item label="材料">
                {analysisResult.material.fileName}
              </Descriptions.Item>
              <Descriptions.Item label="节点">
                {analysisResult.extractedNodes.length}
              </Descriptions.Item>
              <Descriptions.Item label="待审核关系">
                {analysisResult.candidatesCreated}
              </Descriptions.Item>
              <Descriptions.Item label="解析策略">
                {analysisResult.material.parseStrategy || '--'}
              </Descriptions.Item>
              <Descriptions.Item label="解析器">
                {analysisResult.material.parserVersion || '--'}
              </Descriptions.Item>
            </Descriptions>
            <Table
              columns={analysisNodeColumns}
              dataSource={analysisResult.extractedNodes}
              pagination={false}
              rowKey="id"
              size="small"
              style={{ marginTop: 16 }}
            />
          </>
        )}
      </Modal>

      <Modal
        destroyOnClose
        footer={null}
        onCancel={() => setVersionModalOpen(false)}
        open={versionModalOpen}
        title="材料版本与解析记录"
        width={980}
      >
        {versionMaterial && (
          <Descriptions column={2} size="small">
            <Descriptions.Item label="材料">{versionMaterial.fileName}</Descriptions.Item>
            <Descriptions.Item label="当前状态">
              <MaterialStatusTag status={versionMaterial.status} />
            </Descriptions.Item>
            <Descriptions.Item label="解析策略">
              {versionMaterial.parseStrategy || '--'}
            </Descriptions.Item>
            <Descriptions.Item label="解析器版本">
              {versionMaterial.parserVersion || '--'}
            </Descriptions.Item>
          </Descriptions>
        )}
        <Table
          columns={versionColumns}
          dataSource={versions}
          loading={loadingVersions}
          pagination={false}
          rowKey="id"
          size="small"
          style={{ marginTop: 16 }}
        />
      </Modal>
    </main>
  );
}

async function refreshMaterials(
  setUploadedMaterials: (rows: UploadedMaterial[]) => void,
) {
  const rows = await listUploadedMaterials().catch(() => []);
  setUploadedMaterials(rows);
}

function mergeMaterials(
  primary: UploadedMaterial[],
  secondary: UploadedMaterial[],
): UploadedMaterial[] {
  const seen = new Set<string>();
  return [...primary, ...secondary].filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function ocrDescription(status: OcrRuntimeStatus | null): string {
  if (!status) return '正在检查 OCR 运行环境。';
  if (status.available) {
    const langText = status.languages.length
      ? `，语言包：${status.languages.slice(0, 6).join(', ')}`
      : '';
    return `OCR 可用，${status.engine} ${status.version || ''}${langText}`;
  }
  return `OCR 暂不可用：${status.message}`;
}

function extractionNumber(
  record: MaterialVersionApiResponse,
  key: string,
): number {
  const extraction = record.parseArtifacts.extraction;
  if (!isRecord(extraction)) return 0;
  const value = extraction[key];
  return typeof value === 'number' ? value : 0;
}

function ocrTag(record: MaterialVersionApiResponse) {
  const extraction = record.parseArtifacts.extraction;
  if (!isRecord(extraction) || !isRecord(extraction.ocr)) {
    return <Tag>无</Tag>;
  }
  const status = String(extraction.ocr.status || 'unknown');
  const color =
    status === 'success' || status === 'not_required'
      ? 'green'
      : status === 'failed' || status === 'unavailable'
        ? 'red'
        : 'gold';
  return <Tag color={color}>{status}</Tag>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
