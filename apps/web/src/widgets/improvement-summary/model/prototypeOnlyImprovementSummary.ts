import {
  CheckSquareOutlined,
  ClockCircleOutlined,
  ExperimentOutlined,
  SyncOutlined,
} from '@ant-design/icons';

import { prototypeOnlyImprovementCases } from '../../../entities/improvement-case';

export const prototypeOnlyImprovementSummary = [
  {
    detail: '当前改进问题总数',
    icon: CheckSquareOutlined,
    key: 'issues',
    label: '改进问题',
    tone: 'blue',
    value: prototypeOnlyImprovementCases.length,
  },
  {
    detail: '措施正在执行中',
    icon: SyncOutlined,
    key: 'in-progress',
    label: '执行中',
    tone: 'green',
    value: prototypeOnlyImprovementCases.filter(
      (item) => item.status === 'in-progress',
    ).length,
  },
  {
    detail: '等待复评运行',
    icon: ExperimentOutlined,
    key: 'reevaluation',
    label: '待复评',
    tone: 'orange',
    value: prototypeOnlyImprovementCases.filter(
      (item) => item.status === 'awaiting-reevaluation',
    ).length,
  },
  {
    detail: '等待有效性判断',
    icon: ClockCircleOutlined,
    key: 'decision',
    label: '待判效',
    tone: 'purple',
    value: prototypeOnlyImprovementCases.filter(
      (item) => item.status === 'awaiting-decision',
    ).length,
  },
];
