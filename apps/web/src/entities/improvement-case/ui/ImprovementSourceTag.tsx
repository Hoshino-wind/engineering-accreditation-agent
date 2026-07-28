import { Tag } from 'antd';

import type { ImprovementSourceModule } from '../model/improvementCase';

const sourceLabel: Record<ImprovementSourceModule, string> = {
  M3: 'M3 材料',
  M5: 'M5 诊断',
  M6: 'M6 评价',
};

interface ImprovementSourceTagProps {
  module: ImprovementSourceModule;
}

export function ImprovementSourceTag({
  module,
}: ImprovementSourceTagProps) {
  return <Tag>{sourceLabel[module]}</Tag>;
}
