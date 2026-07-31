import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  prototypeOnlySupportPackages,
  type SupportPackage,
} from '../../../entities/support-package';
import {
  createPrototypeOnlySupportExportArtifact,
  deliverPrototypeOnlySupportExportArtifact,
} from './prototypeOnlySupportExportDelivery';

const approvedPackage = prototypeOnlySupportPackages[2]!;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('prototype-only support export delivery', () => {
  it('creates the escaped printable PDF HTML', () => {
    const supportPackage: SupportPackage = {
      ...approvedPackage,
      course: '软件<工程>',
      sections: [
        {
          ...approvedPackage.sections[0]!,
          code: '1&',
          summary: '总结 "可信" & 完整',
          title: '图谱<目标>',
        },
      ],
      title: `毕业<设计> & "认证"'包`,
      version: 'v1&1',
    };
    const artifact = createPrototypeOnlySupportExportArtifact({
      exportedAt: '2026-07-30T10:00:00.000Z',
      format: 'pdf',
      purpose: '内部<归档> & "复核"',
      supportPackage,
    });

    expect(artifact.kind).toBe('print-window');
    expect(artifact.content).toContain(
      `<title>毕业&lt;设计&gt; &amp; &quot;认证&quot;&#039;包</title>`,
    );
    expect(artifact.content).toContain(
      '<h1>毕业&lt;设计&gt; &amp; &quot;认证&quot;&#039;包</h1>',
    );
    expect(artifact.content).toContain('版本：v1&amp;1');
    expect(artifact.content).toContain('课程：软件&lt;工程&gt;');
    expect(artifact.content).toContain(
      '用途：内部&lt;归档&gt; &amp; &quot;复核&quot;',
    );
    expect(artifact.content).toContain(
      '<h2>1&amp; 图谱&lt;目标&gt;</h2><p>总结 &quot;可信&quot; &amp; 完整</p>',
    );
    expect(artifact.content).toContain(
      '<button onclick="window.print()">打印 / 保存为 PDF</button>',
    );
  });

  it('keeps the current HTML .doc delivery contract', () => {
    const supportPackage = {
      ...approvedPackage,
      title: '毕业/设计:认证?支撑|包',
    };
    const artifact = createPrototypeOnlySupportExportArtifact({
      exportedAt: '2026-07-30T10:00:00.000Z',
      format: 'docx',
      purpose: '不会写入当前 Word 正文',
      supportPackage,
    });

    expect(artifact).toMatchObject({
      filename: '毕业-设计-认证-支撑-包.doc',
      kind: 'download',
      mimeType: 'application/msword;charset=utf-8',
    });
    expect(artifact.content).toContain(
      '<!doctype html><html><head><meta charset="utf-8"></head><body>',
    );
    expect(artifact.content).not.toContain('不会写入当前 Word 正文');
    expect(artifact.content).not.toContain(supportPackage.course);
  });

  it('keeps the evidence archive as a pretty-printed JSON manifest', () => {
    const artifact = createPrototypeOnlySupportExportArtifact({
      exportedAt: '2026-07-30T10:00:00.000Z',
      format: 'evidence-archive',
      purpose: '认证材料交接',
      supportPackage: approvedPackage,
    });

    expect(artifact).toMatchObject({
      filename: '毕业设计认证支撑包-evidence-manifest.json',
      kind: 'download',
      mimeType: 'application/json;charset=utf-8',
    });
    expect(artifact.content).toBe(
      JSON.stringify(
        {
          exportedAt: '2026-07-30T10:00:00.000Z',
          format: 'evidence-archive',
          package: approvedPackage,
          purpose: '认证材料交接',
        },
        null,
        2,
      ),
    );
  });

  it('writes and closes the printable report window', () => {
    const write = vi.fn();
    const close = vi.fn();
    const openReport = vi.spyOn(window, 'open').mockReturnValue({
      document: { close, write },
    } as unknown as Window);

    const result = deliverPrototypeOnlySupportExportArtifact({
      content: '<html>report</html>',
      kind: 'print-window',
    });

    expect(result).toBe('delivered');
    expect(openReport).toHaveBeenCalledWith('', '_blank');
    expect(write).toHaveBeenCalledWith('<html>report</html>');
    expect(close).toHaveBeenCalledOnce();
  });

  it('reports a blocked popup without writing a document', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);

    expect(
      deliverPrototypeOnlySupportExportArtifact({
        content: '<html>report</html>',
        kind: 'print-window',
      }),
    ).toBe('popup-blocked');
  });

  it('downloads through a temporary object URL and revokes it', () => {
    let createdBlob: Blob | undefined;
    const createObjectURL = vi.fn(
      (blob: Blob) => {
        createdBlob = blob;
        return 'blob:support-export';
      },
    );
    const revokeObjectURL = vi.fn();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const createElement = vi.spyOn(document, 'createElement');
    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    });

    const result = deliverPrototypeOnlySupportExportArtifact({
      content: 'download body',
      filename: 'support.doc',
      kind: 'download',
      mimeType: 'application/msword;charset=utf-8',
    });
    const anchor = createElement.mock.results[0]
      ?.value as HTMLAnchorElement;

    expect(result).toBe('delivered');
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(createdBlob).toBeInstanceOf(Blob);
    expect(anchor.href).toBe('blob:support-export');
    expect(anchor.download).toBe('support.doc');
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith(
      'blob:support-export',
    );
  });
});
