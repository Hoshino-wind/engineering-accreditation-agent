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
  message,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useState } from 'react';

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
import {
  AutopilotResultDrawer,
  useAutopilotTask,
} from '../../../features/run-autopilot';
import { UploadDropzone } from '../../../features/upload-material';
import { TeachingResourceSummary } from '../../../widgets/teaching-resource-summary';
import { TeachingResourceWorkbench } from '../../../widgets/teaching-resource-workbench';

import './teachingResourcesPage.css';

const { Paragraph, Title } = Typography;

const fileTypeLabel: Record<string, string> = {
  pdf: 'PDF',
  docx: 'DOCX',
  xlsx: 'XLSX',
};

export function TeachingResourcesPage() {
  const [materials, setMaterials] = useState<UploadedMaterial[]>(
    prototypeOnlyUploadedMaterials,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [autopilotDrawerOpen, setAutopilotDrawerOpen] = useState(false);
  const extraction = useExtractionTask();
  const autopilot = useAutopilotTask();

  // 模拟上传：将新文件加入列表顶部
  const handleUpload = (fileName: string, category: UploadedMaterialCategory) => {
    const ext = fileName.split('.').pop()?.toLowerCase() ?? 'pdf';
    const newMaterial: UploadedMaterial = {
      id: `UM-${String(materials.length + 1).padStart(3, '0')}`,
      fileName,
      fileType: (['pdf', 'docx', 'xlsx'].includes(ext) ? ext : 'pdf') as UploadedMaterial['fileType'],
      category,
      uploadTime: new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      uploadedBy: '当前用户',
      status: 'pending',
      fileSize: '--',
      fileUrl: '#',
    };
    setMaterials((prev) => [newMaterial, ...prev]);
  };

  // 打开提取抽屉，启动 AI 提取
  const handleStartExtract = (record: UploadedMaterial) => {
    setDrawerOpen(true);
    void extraction.startExtraction(record);
  };

  // 确认入库：更新材料状态为 extracted
  const handleConfirmExtract = (nodes: ExtractedNode[]) => {
    const materialId = extraction.material?.id;
    if (materialId) {
      setMaterials((prev) =>
        prev.map((m) =>
          m.id === materialId
            ? { ...m, status: 'extracted' as const, extractedNodeCount: nodes.length }
            : m,
        ),
      );
      message.success(`${nodes.length} 个节点已入库，材料状态已更新`);
    }
    setDrawerOpen(false);
    extraction.reset();
  };

  // 关闭抽屉
  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    extraction.reset();
  };

  // 一键自动分析：调用 autopilot 编排接口，完成后弹出结果
  const handleRunAutopilot = async (record: UploadedMaterial) => {
    try {
      const result = await autopilot.run(record.id);
      message.success(
        `分析完成，已生成 ${result.candidates_created} 条关系候选和 ${result.findings_created} 条诊断`,
      );
      setAutopilotDrawerOpen(true);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : '自动分析失败，请稍后重试';
      message.error(msg);
    }
  };

  // 删除材料
  const handleDelete = (record: UploadedMaterial) => {
    setMaterials((prev) => prev.filter((m) => m.id !== record.id));
    message.success(`${record.fileName} 已删除`);
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
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: UploadedMaterial['status']) => (
        <MaterialStatusTag status={status} />
      ),
    },
    {
      title: '提取节点',
      dataIndex: 'extractedNodeCount',
      key: 'extractedNodeCount',
      width: 90,
      render: (count?: number) => (count != null ? `${count} 个` : '--'),
    },
    {
      title: '上传时间',
      dataIndex: 'uploadTime',
      key: 'uploadTime',
      width: 150,
    },
    {
      title: '上传人',
      dataIndex: 'uploadedBy',
      key: 'uploadedBy',
      width: 90,
    },
    {
      title: '操作',
      key: 'action',
      width: 300,
      render: (_, record) => {
        const analyzing =
          autopilot.status === 'running' &&
          autopilot.loadingResourceId === record.id;
        return (
          <Space size={4} wrap>
            <Button
              icon={<ThunderboltOutlined />}
              loading={analyzing}
              onClick={() => handleRunAutopilot(record)}
              size="small"
              type="primary"
            >
              {analyzing ? '分析中...' : 'AI 自动分析'}
            </Button>
            <Button
              icon={<EyeOutlined />}
              onClick={() => message.info(`查看 ${record.fileName} 详情`)}
              size="small"
              type="link"
            >
              详情
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => handleStartExtract(record)}
              size="small"
              type="link"
            >
              提取
            </Button>
            <Popconfirm
              onConfirm={() => handleDelete(record)}
              title="确认删除该材料？"
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

  return (
    <main className="teaching-resources-page">
      <div className="teaching-resources-page-header">
        <div>
          <Space align="center" size={10}>
            <Title level={2}>教学资源与材料</Title>
            <Tag color="geekblue">M3 教学资源</Tag>
          </Space>
          <Paragraph type="secondary">
            上传培养方案、课程大纲、实验指导书等材料，AI 自动提取节点构建能力图谱。
          </Paragraph>
        </div>
      </div>

      <Alert
        className="teaching-resources-notice"
        description="当前有 1 份材料提取失败，1 份材料等待处理；异常材料不会进入 M4 智能识别。"
        icon={<InfoCircleOutlined />}
        showIcon
        title="材料治理状态：先处理异常，再进入能力识别"
        type="warning"
      />

      <Card className="teaching-resources-upload-card" size="small">
        <UploadDropzone onUpload={handleUpload} />
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

      <AutopilotResultDrawer
        open={autopilotDrawerOpen}
        result={autopilot.result}
        onClose={() => setAutopilotDrawerOpen(false)}
      />
    </main>
  );
}
