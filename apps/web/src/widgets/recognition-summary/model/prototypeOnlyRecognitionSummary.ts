import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  FileSearchOutlined,
  WarningOutlined,
} from '@ant-design/icons';

export const prototypeOnlyRecognitionSummary = [
  {
    detail: '等待教师审核',
    icon: FileSearchOutlined,
    key: 'pending',
    label: '待审核候选',
    suffix: '条',
    tone: 'blue',
    value: 27,
  },
  {
    detail: '置信度低于 70%',
    icon: ExclamationCircleOutlined,
    key: 'low-confidence',
    label: '低置信度',
    suffix: '条',
    tone: 'orange',
    value: 6,
  },
  {
    detail: '涉及重复或关系矛盾',
    icon: WarningOutlined,
    key: 'conflicts',
    label: '冲突候选',
    suffix: '条',
    tone: 'red',
    value: 4,
  },
  {
    detail: '已形成审核决定',
    icon: CheckCircleOutlined,
    key: 'reviewed',
    label: '本轮已审核',
    suffix: '条',
    tone: 'green',
    value: 9,
  },
] as const;
