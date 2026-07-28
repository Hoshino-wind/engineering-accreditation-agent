import {
  BorderOuterOutlined,
  FileSearchOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
} from '@ant-design/icons';

export const prototypeOnlyDiagnosticSummary = [
  {
    detail: '较发布门槛低 12 分',
    icon: SafetyCertificateOutlined,
    key: 'health-score',
    label: '图谱健康度',
    suffix: '分',
    tone: 'green',
    value: 78,
  },
  {
    detail: '较上次诊断新增 5 项',
    icon: FileSearchOutlined,
    key: 'open-findings',
    label: '待确认发现',
    suffix: '项',
    tone: 'blue',
    value: 23,
  },
  {
    detail: '较上次诊断新增 2 项',
    icon: WarningOutlined,
    key: 'high-risk',
    label: '高风险发现',
    suffix: '项',
    tone: 'red',
    value: 5,
  },
  {
    detail: '评价路径尚未完整',
    icon: BorderOuterOutlined,
    key: 'coverage-gaps',
    label: '覆盖缺口',
    suffix: '项',
    tone: 'orange',
    value: 8,
  },
] as const;
