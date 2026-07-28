import {
  AppstoreOutlined,
  BlockOutlined,
  CheckCircleOutlined,
  FlagOutlined,
} from '@ant-design/icons';

import { prototypeOnlyAttainmentEvaluations } from '../../../entities/attainment-evaluation';
import { calculateAttainment } from '../../../features/calculate-attainment';

const calculations = prototypeOnlyAttainmentEvaluations.map((evaluation) =>
  calculateAttainment(evaluation),
);
const readyCalculations = calculations.filter(
  (calculation) => calculation.ready,
);
const achievedCount = readyCalculations.filter(
  (calculation) => calculation.outcome === 'achieved',
).length;

export const prototypeOnlyAttainmentSummary = [
  {
    detail: '当前评价对象总数',
    icon: AppstoreOutlined,
    key: 'evaluations',
    label: '评价对象',
    suffix: '项',
    tone: 'green',
    value: prototypeOnlyAttainmentEvaluations.length,
  },
  {
    detail: '可参与计算的对象数量',
    icon: CheckCircleOutlined,
    key: 'ready',
    label: '输入就绪',
    suffix: '项',
    tone: 'blue',
    value: readyCalculations.length,
  },
  {
    detail: '存在阻断问题的对象数量',
    icon: BlockOutlined,
    key: 'blocked',
    label: '阻断问题',
    suffix: '项',
    tone: 'red',
    value: calculations.filter((calculation) => !calculation.ready).length,
  },
  {
    detail: '已达成目标 / 就绪目标',
    icon: FlagOutlined,
    key: 'achieved',
    label: '已达标目标',
    suffix: `/ ${readyCalculations.length}`,
    tone: 'green',
    value: achievedCount,
  },
] as const;
