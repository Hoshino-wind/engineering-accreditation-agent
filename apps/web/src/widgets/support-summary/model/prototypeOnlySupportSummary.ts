import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileDoneOutlined,
  ToolOutlined,
} from '@ant-design/icons';

import { prototypeOnlySupportPackages } from '../../../entities/support-package';
import { validateSupportPackage } from '../../../features/validate-support-package';

export const prototypeOnlySupportSummary = [
  {
    detail: '当前周期总数',
    icon: FileDoneOutlined,
    key: 'packages',
    label: '支撑包',
    tone: 'blue',
    value: prototypeOnlySupportPackages.length,
  },
  {
    detail: '存在导出阻断',
    icon: ToolOutlined,
    key: 'changes-required',
    label: '需修正',
    tone: 'orange',
    value: prototypeOnlySupportPackages.filter(
      (item) => validateSupportPackage(item).blockedCount > 0,
    ).length,
  },
  {
    detail: '等待工作组确认',
    icon: ClockCircleOutlined,
    key: 'review',
    label: '待复核',
    tone: 'purple',
    value: prototypeOnlySupportPackages.filter(
      (item) => item.status === 'ready-for-review',
    ).length,
  },
  {
    detail: '具备受控导出条件',
    icon: CheckCircleOutlined,
    key: 'approved',
    label: '已批准',
    tone: 'green',
    value: prototypeOnlySupportPackages.filter(
      (item) => item.status === 'approved',
    ).length,
  },
];
