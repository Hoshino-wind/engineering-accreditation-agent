import { fireEvent, screen } from '@testing-library/react';

export async function openPilotScoreBatchModal() {
  const preflightEntries = await screen.findAllByRole('button', {
    name: /处理输入问题/,
  });
  fireEvent.click(preflightEntries[0]!);
  const captureButton = await screen.findByRole<HTMLButtonElement>(
    'button',
    { name: /创建试点汇总准备批次/ },
  );
  if (captureButton.disabled) {
    throw new Error('试点汇总准备批次入口不应被禁用');
  }
  fireEvent.click(captureButton);
  await screen.findByLabelText('团队协作 已得总分');
}

export function fillTwoInputScoreTotals() {
  fireEvent.change(screen.getByLabelText('团队协作 已得总分'), {
    target: { value: '30.000000' },
  });
  fireEvent.change(screen.getByLabelText('团队协作 应得总分'), {
    target: { value: '40.0' },
  });
  fireEvent.change(screen.getByLabelText('课堂表现 已得总分'), {
    target: { value: '80.000000' },
  });
  fireEvent.change(screen.getByLabelText('课堂表现 应得总分'), {
    target: { value: '100.00' },
  });
}
