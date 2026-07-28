import {
  AuditOutlined,
  FileTextOutlined,
  LinkOutlined,
  SyncOutlined,
} from '@ant-design/icons';

export const prototypeOnlySummary = [
  {
    key: 'materials',
    title: '已归档材料',
    value: 92,
    suffix: '份',
    icon: <FileTextOutlined />,
  },
  {
    key: 'mappings',
    title: '正式支撑关系',
    value: 148,
    suffix: '条',
    icon: <LinkOutlined />,
  },
  {
    key: 'reviews',
    title: '待审核事项',
    value: 12,
    suffix: '项',
    icon: <AuditOutlined />,
  },
  {
    key: 'improvements',
    title: '进行中改进',
    value: 4,
    suffix: '项',
    icon: <SyncOutlined />,
  },
] as const;

export const prototypeOnlyEvidenceSteps = [
  {
    title: '标准与指标点',
    content: '12 项已维护',
  },
  {
    title: '课程目标',
    content: '36 项已关联',
  },
  {
    title: '实验与评分项',
    content: '96 项待复核',
  },
  {
    title: '达成度评价',
    content: '策略待确认',
  },
  {
    title: '持续改进',
    content: '进入下一周期',
  },
] as const;
