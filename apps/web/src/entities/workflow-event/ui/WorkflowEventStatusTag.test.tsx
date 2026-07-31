import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  WorkflowEventStatusTag,
  type WorkflowEventStatus,
} from '../index';

afterEach(cleanup);

describe('WorkflowEventStatusTag', () => {
  it.each([
    ['success', 'success', '成功'],
    ['blocked', 'error', '阻断'],
    ['warning', 'warning', '警告'],
    ['pending', 'processing', '处理中'],
  ] satisfies [
    WorkflowEventStatus,
    string,
    string,
  ][])('把 %s 映射为 %s 语义色与中文标签', (status, tone, label) => {
    const { container, getByText } = render(
      <WorkflowEventStatusTag status={status} />,
    );

    expect(getByText(label)).toBeTruthy();
    expect(container.querySelector(`.ant-tag-${tone}`)).not.toBeNull();
  });
});
