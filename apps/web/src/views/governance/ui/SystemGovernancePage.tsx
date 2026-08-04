import {
  ApartmentOutlined,
  BookOutlined,
  CheckCircleOutlined,
  EditOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  LinkOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Row,
  Select,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  createAcademicCourse,
  createCompetencyIndicator,
  createCourseObjective,
  createExperimentProject,
  createGraduationRequirement,
  createRubricItem,
  getAcademicCatalog,
  updateAcademicCourse,
  updateAcademicProgram,
  updateCompetencyIndicator,
  updateCourseObjective,
  updateExperimentProject,
  updateGraduationRequirement,
  updateRubricItem,
  type AcademicCatalog,
  type AcademicCourse,
  type AcademicProgram,
  type CompetencyIndicator,
  type CourseObjective,
  type ExperimentProject,
  type GraduationRequirement,
  type RubricItem,
  type SourceMaterial,
  type SupportLink,
} from '../../../shared/api/academicClient';

import './systemGovernancePage.css';

const { Paragraph, Text, Title } = Typography;

type ModalKind =
  | 'program'
  | 'course'
  | 'requirement'
  | 'indicator'
  | 'objective'
  | 'experiment'
  | 'rubric';
type ModalMode = 'create' | 'edit';

interface MasterDataModal {
  kind: ModalKind;
  mode: ModalMode;
  record?:
    | AcademicProgram
    | AcademicCourse
    | GraduationRequirement
    | CompetencyIndicator
    | CourseObjective
    | ExperimentProject
    | RubricItem;
}

interface MasterDataFormValues {
  category?: string;
  code?: string;
  courseId?: string;
  creditHours?: number;
  degree?: string;
  description?: string;
  discipline?: string;
  environment?: string;
  evaluationCycle?: string;
  experimentId?: string;
  indicatorId?: string;
  name?: string;
  owner?: string;
  points?: number;
  programId?: string;
  requirementId?: string;
  sourceMaterialId?: string;
  status?: string;
  term?: string;
  title?: string;
}

type SelectOption = { label: string; value: string };

export function SystemGovernancePage() {
  const [catalog, setCatalog] = useState<AcademicCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [modal, setModal] = useState<MasterDataModal | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<MasterDataFormValues>();

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      setCatalog(await getAcademicCatalog());
    } catch {
      setCatalog(null);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (!modal) {
      form.resetFields();
      return;
    }
    form.setFieldsValue(modalInitialValues(modal, catalog));
  }, [catalog, form, modal]);

  const lookup = useMemo(() => buildLookup(catalog), [catalog]);
  const programOptions = useMemo<SelectOption[]>(
    () =>
      catalog?.program
        ? [{ label: catalog.program.name, value: catalog.program.id }]
        : [],
    [catalog],
  );
  const requirementOptions = useMemo<SelectOption[]>(
    () =>
      (catalog?.graduationRequirements ?? []).map((item) => ({
        label: `${item.code} ${item.title}`,
        value: item.id,
      })),
    [catalog],
  );
  const courseOptions = useMemo<SelectOption[]>(
    () =>
      (catalog?.courses ?? []).map((item) => ({
        label: `${item.code} ${item.name}`,
        value: item.id,
      })),
    [catalog],
  );
  const experimentOptions = useMemo<SelectOption[]>(
    () =>
      (catalog?.experiments ?? []).map((item) => ({
        label: `${item.code} ${item.title}`,
        value: item.id,
      })),
    [catalog],
  );
  const indicatorOptions = useMemo<SelectOption[]>(
    () =>
      (catalog?.indicators ?? []).map((item) => ({
        label: `${item.code} ${item.title}`,
        value: item.id,
      })),
    [catalog],
  );
  const materialOptions = useMemo<SelectOption[]>(
    () =>
      (catalog?.sourceMaterials ?? []).map((item) => ({
        label: item.fileName,
        value: item.id,
      })),
    [catalog],
  );

  const openModal = (
    kind: ModalKind,
    mode: ModalMode,
    record?: MasterDataModal['record'],
  ) => {
    setModal({ kind, mode, record });
  };

  const handleSubmit = async (values: MasterDataFormValues) => {
    if (!modal) return;
    setSaving(true);
    try {
      if (modal.kind === 'program') {
        await updateAcademicProgram({
          code: requiredString(values.code),
          name: requiredString(values.name),
          discipline: requiredString(values.discipline),
          degree: requiredString(values.degree),
          owner: requiredString(values.owner),
          evaluationCycle: requiredString(values.evaluationCycle),
          status: requiredString(values.status),
        });
      }

      if (modal.kind === 'course') {
        const payload = {
          programId: values.programId,
          code: requiredString(values.code),
          name: requiredString(values.name),
          category: requiredString(values.category),
          term: requiredString(values.term),
          creditHours: Number(values.creditHours ?? 0),
          owner: requiredString(values.owner),
          status: requiredString(values.status),
        };
        if (modal.mode === 'edit' && modal.record) {
          await updateAcademicCourse((modal.record as AcademicCourse).id, payload);
        } else {
          await createAcademicCourse(payload);
        }
      }

      if (modal.kind === 'requirement') {
        const payload = {
          programId: values.programId,
          code: requiredString(values.code),
          title: requiredString(values.title),
          description: requiredString(values.description),
        };
        if (modal.mode === 'edit' && modal.record) {
          await updateGraduationRequirement(
            (modal.record as GraduationRequirement).id,
            payload,
          );
        } else {
          await createGraduationRequirement(payload);
        }
      }

      if (modal.kind === 'indicator') {
        const payload = {
          requirementId: requiredString(values.requirementId),
          code: requiredString(values.code),
          title: requiredString(values.title),
          description: requiredString(values.description),
        };
        if (modal.mode === 'edit' && modal.record) {
          await updateCompetencyIndicator(
            (modal.record as CompetencyIndicator).id,
            payload,
          );
        } else {
          await createCompetencyIndicator(payload);
        }
      }

      if (modal.kind === 'objective') {
        const payload = {
          courseId: requiredString(values.courseId),
          code: requiredString(values.code),
          title: requiredString(values.title),
          description: requiredString(values.description),
        };
        if (modal.mode === 'edit' && modal.record) {
          await updateCourseObjective((modal.record as CourseObjective).id, payload);
        } else {
          await createCourseObjective(payload);
        }
      }

      if (modal.kind === 'experiment') {
        const payload = {
          courseId: requiredString(values.courseId),
          code: requiredString(values.code),
          title: requiredString(values.title),
          description: requiredString(values.description),
          environment: requiredString(values.environment),
          sourceMaterialId: values.sourceMaterialId || null,
        };
        if (modal.mode === 'edit' && modal.record) {
          await updateExperimentProject(
            (modal.record as ExperimentProject).id,
            payload,
          );
        } else {
          await createExperimentProject(payload);
        }
      }

      if (modal.kind === 'rubric') {
        const payload = {
          courseId: requiredString(values.courseId),
          experimentId: values.experimentId || null,
          indicatorId: requiredString(values.indicatorId),
          code: requiredString(values.code),
          title: requiredString(values.title),
          points: Number(values.points ?? 0),
        };
        if (modal.mode === 'edit' && modal.record) {
          await updateRubricItem((modal.record as RubricItem).id, payload);
        } else {
          await createRubricItem(payload);
        }
      }

      message.success('主数据已保存');
      setModal(null);
      await loadCatalog();
    } catch (error) {
      const msg = error instanceof Error ? error.message : '主数据保存失败';
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const courseColumns: ColumnsType<AcademicCourse> = [
    {
      title: '课程',
      dataIndex: 'name',
      key: 'name',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.name}</Text>
          <Text type="secondary">{record.code}</Text>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'category',
      key: 'category',
      width: 120,
    },
    {
      title: '学期',
      dataIndex: 'term',
      key: 'term',
      width: 140,
    },
    {
      title: '学时',
      dataIndex: 'creditHours',
      key: 'creditHours',
      width: 90,
    },
    {
      title: '负责人',
      dataIndex: 'owner',
      key: 'owner',
      width: 110,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: string) => <Tag color="green">{status}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 90,
      render: (_, record) => (
        <Button
          icon={<EditOutlined />}
          onClick={() => openModal('course', 'edit', record)}
          size="small"
          type="link"
        >
          编辑
        </Button>
      ),
    },
  ];

  const requirementColumns: ColumnsType<GraduationRequirement> = [
    {
      title: '毕业要求',
      dataIndex: 'code',
      key: 'code',
      width: 110,
      render: (code: string) => <Tag color="blue">{code}</Tag>,
    },
    {
      title: '名称',
      dataIndex: 'title',
      key: 'title',
      width: 180,
    },
    {
      title: '说明',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 90,
      render: (_, record) => (
        <Button
          icon={<EditOutlined />}
          onClick={() => openModal('requirement', 'edit', record)}
          size="small"
          type="link"
        >
          编辑
        </Button>
      ),
    },
  ];

  const indicatorColumns: ColumnsType<CompetencyIndicator> = [
    {
      title: '指标点',
      dataIndex: 'code',
      key: 'code',
      width: 110,
      render: (code: string) => <Tag color="geekblue">{code}</Tag>,
    },
    {
      title: '所属毕业要求',
      dataIndex: 'requirementId',
      key: 'requirementId',
      width: 140,
      render: (id: string) => lookup.requirements.get(id)?.code ?? id,
    },
    {
      title: '名称',
      dataIndex: 'title',
      key: 'title',
      width: 180,
    },
    {
      title: '说明',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 90,
      render: (_, record) => (
        <Button
          icon={<EditOutlined />}
          onClick={() => openModal('indicator', 'edit', record)}
          size="small"
          type="link"
        >
          编辑
        </Button>
      ),
    },
  ];

  const objectiveColumns: ColumnsType<CourseObjective> = [
    {
      title: '课程目标',
      dataIndex: 'title',
      key: 'title',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.title}</Text>
          <Text type="secondary">{record.code}</Text>
        </Space>
      ),
    },
    {
      title: '课程',
      dataIndex: 'courseId',
      key: 'courseId',
      width: 180,
      render: (id: string) => lookup.courses.get(id)?.name ?? id,
    },
    {
      title: '说明',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 90,
      render: (_, record) => (
        <Button
          icon={<EditOutlined />}
          onClick={() => openModal('objective', 'edit', record)}
          size="small"
          type="link"
        >
          编辑
        </Button>
      ),
    },
  ];

  const experimentColumns: ColumnsType<ExperimentProject> = [
    {
      title: '实验项目',
      dataIndex: 'title',
      key: 'title',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.title}</Text>
          <Text type="secondary">{record.code}</Text>
        </Space>
      ),
    },
    {
      title: '课程',
      dataIndex: 'courseId',
      key: 'courseId',
      width: 180,
      render: (id: string) => lookup.courses.get(id)?.name ?? id,
    },
    {
      title: '环境',
      dataIndex: 'environment',
      key: 'environment',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 90,
      render: (_, record) => (
        <Button
          icon={<EditOutlined />}
          onClick={() => openModal('experiment', 'edit', record)}
          size="small"
          type="link"
        >
          编辑
        </Button>
      ),
    },
  ];

  const rubricColumns: ColumnsType<RubricItem> = [
    {
      title: '评分项',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '关联指标点',
      dataIndex: 'indicatorId',
      key: 'indicatorId',
      width: 140,
      render: (id: string) => lookup.indicators.get(id)?.code ?? id,
    },
    {
      title: '分值',
      dataIndex: 'points',
      key: 'points',
      width: 90,
    },
    {
      title: '操作',
      key: 'action',
      width: 90,
      render: (_, record) => (
        <Button
          icon={<EditOutlined />}
          onClick={() => openModal('rubric', 'edit', record)}
          size="small"
          type="link"
        >
          编辑
        </Button>
      ),
    },
  ];

  const materialColumns: ColumnsType<SourceMaterial> = [
    {
      title: '来源材料',
      dataIndex: 'fileName',
      key: 'fileName',
      ellipsis: true,
    },
    {
      title: '类型',
      dataIndex: 'materialType',
      key: 'materialType',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: string) => <Tag color="processing">{status}</Tag>,
    },
    {
      title: '校验',
      dataIndex: 'checksum',
      key: 'checksum',
      width: 170,
      ellipsis: true,
    },
  ];

  const linkColumns: ColumnsType<SupportLink> = [
    {
      title: '来源',
      key: 'source',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>{sourceTitle(record, lookup)}</Text>
          <Text type="secondary">{record.sourceType}</Text>
        </Space>
      ),
    },
    {
      title: '目标指标点',
      dataIndex: 'targetIndicatorId',
      key: 'targetIndicatorId',
      width: 140,
      render: (id: string) => lookup.indicators.get(id)?.code ?? id,
    },
    {
      title: '强度',
      dataIndex: 'strength',
      key: 'strength',
      width: 90,
      render: (value: string) => <Tag color={strengthColor(value)}>{value}</Tag>,
    },
    {
      title: '证据',
      dataIndex: 'evidence',
      key: 'evidence',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: string) => <Tag>{status}</Tag>,
    },
  ];

  if (loading) {
    return (
      <main className="system-governance-page">
        <Skeleton active paragraph={{ rows: 8 }} />
      </main>
    );
  }

  if (failed || !catalog) {
    return (
      <main className="system-governance-page">
        <Empty description="主数据暂时无法加载，请确认后端服务已启动" />
      </main>
    );
  }

  return (
    <main className="system-governance-page">
      <header className="system-governance-header">
        <div>
          <Space align="center" size={10}>
            <Title level={2}>系统治理</Title>
            <Tag color="purple">M9 主数据</Tag>
            <Tag color="green">可维护</Tag>
          </Space>
          <Paragraph type="secondary">
            管理专业、课程、毕业要求、指标点、课程目标、实验项目和评分项，为材料解析、图谱审核和达成度评价提供统一数据底座。
          </Paragraph>
        </div>
      </header>

      <Alert
        className="system-governance-notice"
        description="当前已支持专业、课程、毕业要求、指标点、课程目标、实验项目和评分项的新增/编辑；审核通过的支撑关系会自动写入图谱和支撑关系表。"
        showIcon
        title="主数据治理已接入数据库写入"
        type="success"
      />

      <section className="system-governance-program">
        <div>
          <Text type="secondary">当前专业</Text>
          <Title level={3}>{catalog.program?.name ?? '未配置专业'}</Title>
          <Text>
            {catalog.program?.discipline} / {catalog.program?.degree} /{' '}
            {catalog.program?.evaluationCycle}
          </Text>
        </div>
        <Space>
          <Tag color="gold">{catalog.program?.status ?? 'draft'}</Tag>
          {catalog.program && (
            <Button
              icon={<EditOutlined />}
              onClick={() => openModal('program', 'edit', catalog.program ?? undefined)}
            >
              编辑专业
            </Button>
          )}
        </Space>
      </section>

      <Row gutter={16} className="system-governance-stats">
        <Col xs={12} lg={4}>
          <Card size="small">
            <Statistic prefix={<BookOutlined />} title="课程" value={catalog.courses.length} />
          </Card>
        </Col>
        <Col xs={12} lg={4}>
          <Card size="small">
            <Statistic
              prefix={<ApartmentOutlined />}
              title="指标点"
              value={catalog.indicators.length}
            />
          </Card>
        </Col>
        <Col xs={12} lg={4}>
          <Card size="small">
            <Statistic
              prefix={<ExperimentOutlined />}
              title="实验项目"
              value={catalog.experiments.length}
            />
          </Card>
        </Col>
        <Col xs={12} lg={4}>
          <Card size="small">
            <Statistic
              prefix={<CheckCircleOutlined />}
              title="评分项"
              value={catalog.rubricItems.length}
            />
          </Card>
        </Col>
        <Col xs={12} lg={4}>
          <Card size="small">
            <Statistic
              prefix={<FileTextOutlined />}
              title="来源材料"
              value={catalog.sourceMaterials.length}
            />
          </Card>
        </Col>
        <Col xs={12} lg={4}>
          <Card size="small">
            <Statistic
              prefix={<LinkOutlined />}
              title="支撑关系"
              value={catalog.supportLinks.length}
            />
          </Card>
        </Col>
      </Row>

      <section className="system-governance-section">
        <div className="system-governance-section-title">
          <Title level={4}>课程配置</Title>
          <Button
            icon={<PlusOutlined />}
            onClick={() => openModal('course', 'create')}
            size="small"
            type="primary"
          >
            新增课程
          </Button>
        </div>
        <Table
          columns={courseColumns}
          dataSource={catalog.courses}
          pagination={false}
          rowKey="id"
          size="small"
        />
      </section>

      <section className="system-governance-section">
        <div className="system-governance-section-title">
          <Title level={4}>课程目标</Title>
          <Button
            icon={<PlusOutlined />}
            onClick={() => openModal('objective', 'create')}
            size="small"
            type="primary"
          >
            新增课程目标
          </Button>
        </div>
        <Table
          columns={objectiveColumns}
          dataSource={catalog.objectives}
          pagination={false}
          rowKey="id"
          size="small"
        />
      </section>

      <Row gutter={16} className="system-governance-section">
        <Col xs={24} lg={10}>
          <div className="system-governance-section-title">
            <Title level={4}>毕业要求</Title>
            <Button
              icon={<PlusOutlined />}
              onClick={() => openModal('requirement', 'create')}
              size="small"
              type="primary"
            >
              新增要求
            </Button>
          </div>
          <Table
            columns={requirementColumns}
            dataSource={catalog.graduationRequirements}
            pagination={false}
            rowKey="id"
            size="small"
          />
        </Col>
        <Col xs={24} lg={14}>
          <div className="system-governance-section-title">
            <Title level={4}>指标点</Title>
            <Button
              icon={<PlusOutlined />}
              onClick={() => openModal('indicator', 'create')}
              size="small"
              type="primary"
            >
              新增指标点
            </Button>
          </div>
          <Table
            columns={indicatorColumns}
            dataSource={catalog.indicators}
            pagination={false}
            rowKey="id"
            size="small"
          />
        </Col>
      </Row>

      <section className="system-governance-section">
        <Title level={4}>实验项目与评分项</Title>
        <Row gutter={16}>
          <Col xs={24} lg={13}>
            <Table
              title={() => (
                <div className="system-governance-section-title">
                  <Text strong>实验项目</Text>
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() => openModal('experiment', 'create')}
                    size="small"
                    type="primary"
                  >
                    新增实验项目
                  </Button>
                </div>
              )}
              columns={experimentColumns}
              dataSource={catalog.experiments}
              pagination={false}
              rowKey="id"
              size="small"
            />
          </Col>
          <Col xs={24} lg={11}>
            <Table
              title={() => (
                <div className="system-governance-section-title">
                  <Text strong>评分项</Text>
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() => openModal('rubric', 'create')}
                    size="small"
                    type="primary"
                  >
                    新增评分项
                  </Button>
                </div>
              )}
              columns={rubricColumns}
              dataSource={catalog.rubricItems}
              pagination={false}
              rowKey="id"
              size="small"
            />
          </Col>
        </Row>
      </section>

      <section className="system-governance-section">
        <Title level={4}>材料与支撑关系</Title>
        <Row gutter={16}>
          <Col xs={24} lg={11}>
            <Table
              columns={materialColumns}
              dataSource={catalog.sourceMaterials}
              pagination={false}
              rowKey="id"
              size="small"
            />
          </Col>
          <Col xs={24} lg={13}>
            <Table
              columns={linkColumns}
              dataSource={catalog.supportLinks}
              pagination={false}
              rowKey="id"
              size="small"
            />
          </Col>
        </Row>
      </section>

      <Modal
        confirmLoading={saving}
        destroyOnClose
        okText="保存"
        onCancel={() => setModal(null)}
        onOk={() => form.submit()}
        open={Boolean(modal)}
        title={modalTitle(modal)}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {renderModalFields({
            courseOptions,
            experimentOptions,
            indicatorOptions,
            materialOptions,
            modal,
            programOptions,
            requirementOptions,
          })}
        </Form>
      </Modal>
    </main>
  );
}

function renderModalFields({
  courseOptions,
  experimentOptions,
  indicatorOptions,
  materialOptions,
  modal,
  programOptions,
  requirementOptions,
}: {
  courseOptions: SelectOption[];
  experimentOptions: SelectOption[];
  indicatorOptions: SelectOption[];
  materialOptions: SelectOption[];
  modal: MasterDataModal | null;
  programOptions: SelectOption[];
  requirementOptions: SelectOption[];
}) {
  if (!modal) return null;

  if (modal.kind === 'program') {
    return (
      <>
        <Form.Item label="专业代码" name="code" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="专业名称" name="name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item label="学科门类" name="discipline" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="授予学位" name="degree" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item label="负责人" name="owner" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="认证周期" name="evaluationCycle" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label="状态" name="status" rules={[{ required: true }]}>
          <Select options={statusOptions} />
        </Form.Item>
      </>
    );
  }

  if (modal.kind === 'course') {
    return (
      <>
        <Form.Item label="所属专业" name="programId" rules={[{ required: true }]}>
          <Select options={programOptions} />
        </Form.Item>
        <Row gutter={12}>
          <Col span={10}>
            <Form.Item label="课程代码" name="code" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={14}>
            <Form.Item label="课程名称" name="name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item label="课程类型" name="category" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="开课学期" name="term" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item label="学时" name="creditHours" rules={[{ required: true }]}>
              <InputNumber min={0} precision={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="负责人" name="owner" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label="状态" name="status" rules={[{ required: true }]}>
          <Select options={statusOptions} />
        </Form.Item>
      </>
    );
  }

  if (modal.kind === 'requirement') {
    return (
      <>
        <Form.Item label="所属专业" name="programId" rules={[{ required: true }]}>
          <Select options={programOptions} />
        </Form.Item>
        <Row gutter={12}>
          <Col span={10}>
            <Form.Item label="毕业要求代码" name="code" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={14}>
            <Form.Item label="毕业要求名称" name="title" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label="说明" name="description" rules={[{ required: true }]}>
          <Input.TextArea rows={4} />
        </Form.Item>
      </>
    );
  }

  if (modal.kind === 'indicator') {
    return (
      <>
        <Form.Item label="所属毕业要求" name="requirementId" rules={[{ required: true }]}>
          <Select options={requirementOptions} />
        </Form.Item>
        <Row gutter={12}>
          <Col span={10}>
            <Form.Item label="指标点代码" name="code" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={14}>
            <Form.Item label="指标点名称" name="title" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label="说明" name="description" rules={[{ required: true }]}>
          <Input.TextArea rows={4} />
        </Form.Item>
      </>
    );
  }

  if (modal.kind === 'objective') {
    return (
      <>
        <Form.Item label="所属课程" name="courseId" rules={[{ required: true }]}>
          <Select options={courseOptions} />
        </Form.Item>
        <Row gutter={12}>
          <Col span={10}>
            <Form.Item label="目标代码" name="code" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={14}>
            <Form.Item label="目标名称" name="title" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label="说明" name="description" rules={[{ required: true }]}>
          <Input.TextArea rows={4} />
        </Form.Item>
      </>
    );
  }

  if (modal.kind === 'experiment') {
    return (
      <>
        <Form.Item label="所属课程" name="courseId" rules={[{ required: true }]}>
          <Select options={courseOptions} />
        </Form.Item>
        <Row gutter={12}>
          <Col span={10}>
            <Form.Item label="实验代码" name="code" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={14}>
            <Form.Item label="实验名称" name="title" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label="实验环境" name="environment" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="来源材料" name="sourceMaterialId">
          <Select allowClear options={materialOptions} />
        </Form.Item>
        <Form.Item label="说明" name="description" rules={[{ required: true }]}>
          <Input.TextArea rows={4} />
        </Form.Item>
      </>
    );
  }

  return (
    <>
      <Form.Item label="所属课程" name="courseId" rules={[{ required: true }]}>
        <Select options={courseOptions} />
      </Form.Item>
      <Form.Item label="实验项目" name="experimentId">
        <Select allowClear options={experimentOptions} />
      </Form.Item>
      <Form.Item label="关联指标点" name="indicatorId" rules={[{ required: true }]}>
        <Select options={indicatorOptions} />
      </Form.Item>
      <Row gutter={12}>
        <Col span={10}>
          <Form.Item label="评分项代码" name="code" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Col>
        <Col span={14}>
          <Form.Item label="评分项名称" name="title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item label="分值" name="points" rules={[{ required: true }]}>
        <InputNumber min={0} precision={1} style={{ width: '100%' }} />
      </Form.Item>
    </>
  );
}

function modalInitialValues(
  modal: MasterDataModal,
  catalog: AcademicCatalog | null,
): MasterDataFormValues {
  if (modal.kind === 'program' && modal.record) {
    const record = modal.record as AcademicProgram;
    return {
      code: record.code,
      degree: record.degree,
      discipline: record.discipline,
      evaluationCycle: record.evaluationCycle,
      name: record.name,
      owner: record.owner,
      status: record.status,
    };
  }

  if (modal.kind === 'course') {
    if (modal.mode === 'edit' && modal.record) {
      const record = modal.record as AcademicCourse;
      return {
        category: record.category,
        code: record.code,
        creditHours: record.creditHours,
        name: record.name,
        owner: record.owner,
        programId: record.programId,
        status: record.status,
        term: record.term,
      };
    }
    return {
      category: '专业核心课',
      creditHours: 32,
      programId: catalog?.program?.id,
      status: 'active',
      term: catalog?.program?.evaluationCycle ?? '',
    };
  }

  if (modal.kind === 'requirement') {
    if (modal.mode === 'edit' && modal.record) {
      const record = modal.record as GraduationRequirement;
      return {
        code: record.code,
        description: record.description,
        programId: record.programId,
        title: record.title,
      };
    }
    return {
      programId: catalog?.program?.id,
    };
  }

  if (modal.kind === 'indicator') {
    if (modal.mode === 'edit' && modal.record) {
      const record = modal.record as CompetencyIndicator;
      return {
        code: record.code,
        description: record.description,
        requirementId: record.requirementId,
        title: record.title,
      };
    }
    return {
      requirementId: catalog?.graduationRequirements[0]?.id,
    };
  }

  if (modal.kind === 'objective') {
    if (modal.mode === 'edit' && modal.record) {
      const record = modal.record as CourseObjective;
      return {
        code: record.code,
        courseId: record.courseId,
        description: record.description,
        title: record.title,
      };
    }
    return {
      courseId: catalog?.courses[0]?.id,
    };
  }

  if (modal.kind === 'experiment') {
    if (modal.mode === 'edit' && modal.record) {
      const record = modal.record as ExperimentProject;
      return {
        code: record.code,
        courseId: record.courseId,
        description: record.description,
        environment: record.environment,
        sourceMaterialId: record.sourceMaterialId || undefined,
        title: record.title,
      };
    }
    return {
      courseId: catalog?.courses[0]?.id,
      environment: '实验箱、开发板、嵌入式调试环境',
    };
  }

  if (modal.mode === 'edit' && modal.record) {
    const record = modal.record as RubricItem;
    return {
      code: record.code,
      courseId: record.courseId,
      experimentId: record.experimentId ?? undefined,
      indicatorId: record.indicatorId,
      points: record.points,
      title: record.title,
    };
  }
  return {
    courseId: catalog?.courses[0]?.id,
    experimentId: catalog?.experiments[0]?.id,
    indicatorId: catalog?.indicators[0]?.id,
    points: 10,
  };
}

function modalTitle(modal: MasterDataModal | null): string {
  if (!modal) return '';
  const action = modal.mode === 'create' ? '新增' : '编辑';
  const label = {
    course: '课程',
    experiment: '实验项目',
    indicator: '指标点',
    objective: '课程目标',
    program: '专业',
    requirement: '毕业要求',
    rubric: '评分项',
  }[modal.kind];
  return `${action}${label}`;
}

function buildLookup(catalog: AcademicCatalog | null) {
  return {
    courses: new Map((catalog?.courses ?? []).map((item) => [item.id, item])),
    experiments: new Map(
      (catalog?.experiments ?? []).map((item) => [item.id, item]),
    ),
    indicators: new Map((catalog?.indicators ?? []).map((item) => [item.id, item])),
    requirements: new Map(
      (catalog?.graduationRequirements ?? []).map((item) => [item.id, item]),
    ),
  };
}

function sourceTitle(
  link: SupportLink,
  lookup: ReturnType<typeof buildLookup>,
): string {
  if (link.sourceType === 'course') {
    return lookup.courses.get(link.sourceId)?.name ?? link.sourceId;
  }
  if (link.sourceType === 'experiment') {
    return lookup.experiments.get(link.sourceId)?.title ?? link.sourceId;
  }
  return link.sourceId;
}

function strengthColor(value: string): string {
  switch (value) {
    case 'strong':
      return 'green';
    case 'medium':
      return 'gold';
    case 'weak':
      return 'orange';
    default:
      return 'default';
  }
}

function requiredString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

const statusOptions = [
  { label: '启用', value: 'active' },
  { label: '试点', value: 'pilot' },
  { label: '草稿', value: 'draft' },
  { label: '停用', value: 'inactive' },
];
