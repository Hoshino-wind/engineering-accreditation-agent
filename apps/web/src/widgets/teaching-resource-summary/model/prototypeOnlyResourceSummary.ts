import {
  CheckCircleOutlined,
  FileTextOutlined,
  NodeIndexOutlined,
  WarningOutlined,
} from '@ant-design/icons';

export const prototypeOnlyResourceSummary = [
  {
    key: 'total',
    label: '纳管材料',
    value: 104,
    suffix: '份',
    detail: '覆盖 8 门试点课程',
    icon: FileTextOutlined,
    tone: 'blue',
  },
  {
    key: 'ready',
    label: '可引用材料',
    value: 92,
    suffix: '份',
    detail: '处理完成率 88.5%',
    icon: CheckCircleOutlined,
    tone: 'green',
  },
  {
    key: 'fragments',
    label: '证据片段',
    value: 1268,
    suffix: '条',
    detail: '均保留来源坐标与哈希',
    icon: NodeIndexOutlined,
    tone: 'geekblue',
  },
  {
    key: 'exceptions',
    label: '待处理异常',
    value: 3,
    suffix: '项',
    detail: '解析失败 2 · 待分类 1',
    icon: WarningOutlined,
    tone: 'orange',
  },
] as const;
