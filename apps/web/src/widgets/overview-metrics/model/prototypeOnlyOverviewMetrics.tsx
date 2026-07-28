import {
  AuditOutlined,
  FileTextOutlined,
  LinkOutlined,
  SyncOutlined,
} from '@ant-design/icons';

export const prototypeOnlyOverviewMetrics = [
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
