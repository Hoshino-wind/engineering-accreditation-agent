import { Tag } from 'antd';

import type { ImprovementSourceModule } from '../model/improvementCase';

const sourceLabel: Record<ImprovementSourceModule, string> = {
  M3: '来自教学材料',
  M5: '来自图谱诊断',
  M6: '来自达成度评价',
};

interface ImprovementSourceTagProps {
  module: ImprovementSourceModule;
}

export function ImprovementSourceTag({
  module,
}: ImprovementSourceTagProps) {
  return <Tag>{sourceLabel[module]}</Tag>;
}
