import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { prototypeOnlySupportPackages } from '../../entities/support-package';
import { readWorkflowEvents } from '../../entities/workflow-event';
import { SupportExportControls } from './index';
import { deliverPrototypeOnlySupportPackageExport } from './model/prototypeOnlySupportExportDelivery';

vi.mock('./model/prototypeOnlySupportExportDelivery', () => ({
  deliverPrototypeOnlySupportPackageExport: vi.fn(
    () => 'delivered',
  ),
}));

const approvedPackage = prototypeOnlySupportPackages[2]!;
const exportedPackage = prototypeOnlySupportPackages[4]!;
const deliverExport = vi.mocked(
  deliverPrototypeOnlySupportPackageExport,
);

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      disconnect() {}
      observe() {}
      unobserve() {}
    },
  );
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
});

afterAll(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  window.localStorage.clear();
  deliverExport.mockReset();
  deliverExport.mockReturnValue('delivered');
});

afterEach(cleanup);

interface ControlsFixtureProps {
  canExport?: boolean;
  canSubmitForReview?: boolean;
  supportPackage?: typeof approvedPackage;
}

function ControlsFixture({
  canExport = true,
  canSubmitForReview = false,
  supportPackage = approvedPackage,
}: ControlsFixtureProps) {
  return (
    <AntdApp>
      <SupportExportControls
        blockedCount={0}
        canExport={canExport}
        canSubmitForReview={canSubmitForReview}
        requiresNewVersion={false}
        supportPackage={supportPackage}
      />
    </AntdApp>
  );
}

function getFormatRadio(value: string) {
  return document.querySelector<HTMLInputElement>(
    `input[type="radio"][value="${value}"]`,
  )!;
}

describe('SupportExportControls public behavior', () => {
  it('keeps independent raw drafts for each support package', async () => {
    const { rerender } = render(<ControlsFixture />);
    const purposeInput = screen.getByPlaceholderText(
      '填写导出用途（必填）',
    );

    expect(getFormatRadio('pdf').checked).toBe(true);
    expect(
      screen.getByRole('button', { name: '导出支撑包' }),
    ).toHaveProperty('disabled', true);
    fireEvent.change(purposeInput, {
      target: { value: '  认证材料归档  ' },
    });
    fireEvent.click(getFormatRadio('docx'));

    await waitFor(() => {
      expect(
        JSON.parse(
          window.localStorage.getItem(
            'engineering-accreditation.m8-export-drafts.v1',
          ) ?? '{}',
        ),
      ).toEqual({
        [approvedPackage.id]: {
          format: 'docx',
          purpose: '  认证材料归档  ',
        },
      });
    });
    expect(screen.getByText('配置已自动保存')).not.toBeNull();

    rerender(
      <ControlsFixture supportPackage={exportedPackage} />,
    );
    expect(
      screen.getByPlaceholderText<HTMLTextAreaElement>(
        '填写导出用途（必填）',
      ).value,
    ).toBe('');
    expect(getFormatRadio('pdf').checked).toBe(true);

    rerender(<ControlsFixture />);
    expect(
      screen.getByPlaceholderText<HTMLTextAreaElement>(
        '填写导出用途（必填）',
      ).value,
    ).toBe('  认证材料归档  ');
    expect(getFormatRadio('docx').checked).toBe(true);

    rerender(<ControlsFixture canExport={false} />);
    const unavailableAction = screen.getByRole('button', {
      name: '提交复核',
    });
    expect(unavailableAction).toHaveProperty('disabled', true);
    fireEvent.click(unavailableAction);
    expect(deliverExport).not.toHaveBeenCalled();
    expect(readWorkflowEvents()).toEqual([]);
  });

  it('delivers before recording a successful export event', async () => {
    render(<ControlsFixture />);
    deliverExport.mockImplementationOnce((input) => {
      expect(readWorkflowEvents()).toEqual([]);
      expect(input).toEqual({
        format: 'docx',
        purpose: '认证材料交接',
        supportPackage: approvedPackage,
      });
      return 'delivered';
    });

    fireEvent.change(
      screen.getByPlaceholderText('填写导出用途（必填）'),
      {
        target: { value: '  认证材料交接  ' },
      },
    );
    fireEvent.click(getFormatRadio('docx'));
    fireEvent.click(
      screen.getByRole('button', { name: '导出支撑包' }),
    );

    expect(deliverExport).toHaveBeenCalledOnce();
    expect(readWorkflowEvents()[0]).toMatchObject({
      action: '受控导出支撑包',
      actor: '当前用户',
      module: 'M8',
      objectId: approvedPackage.id,
      status: 'success',
      summary: `${approvedPackage.title} · docx · 认证材料交接`,
    });
    await waitFor(() => {
      expect(document.body.textContent).toContain(
        '导出内容已生成，并写入审计轨迹',
      );
    });
  });

  it('does not record success when the PDF popup is blocked', async () => {
    render(<ControlsFixture />);
    deliverExport.mockReturnValueOnce('popup-blocked');

    fireEvent.change(
      screen.getByPlaceholderText('填写导出用途（必填）'),
      {
        target: { value: '打印归档' },
      },
    );
    fireEvent.click(
      screen.getByRole('button', { name: '导出支撑包' }),
    );

    expect(deliverExport).toHaveBeenCalledOnce();
    expect(readWorkflowEvents()).toEqual([]);
    await waitFor(() => {
      expect(document.body.textContent).toContain(
        '浏览器阻止了打印窗口，请允许弹窗后重试',
      );
    });
  });

  it('records review submission without invoking delivery', async () => {
    render(
      <ControlsFixture
        canExport={false}
        canSubmitForReview
      />,
    );

    fireEvent.change(
      screen.getByPlaceholderText('填写导出用途（必填）'),
      {
        target: { value: '工作组复核' },
      },
    );
    fireEvent.click(
      screen.getByRole('button', { name: '提交复核' }),
    );

    expect(deliverExport).not.toHaveBeenCalled();
    expect(readWorkflowEvents()[0]).toMatchObject({
      action: '提交支撑包复核',
      actor: '当前用户',
      module: 'M8',
      objectId: approvedPackage.id,
      status: 'pending',
      summary: `${approvedPackage.title} ${approvedPackage.version}`,
    });
    await waitFor(() => {
      expect(document.body.textContent).toContain(
        '支撑包已提交复核，并写入审计轨迹',
      );
    });
  });
});
