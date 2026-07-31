import type {
  SupportExportFormat,
  SupportPackage,
} from '../../../entities/support-package';

interface CreatePrototypeOnlySupportExportArtifactInput {
  exportedAt?: string;
  format: SupportExportFormat;
  purpose: string;
  supportPackage: SupportPackage;
}

export type PrototypeOnlySupportExportArtifact =
  | {
      content: string;
      kind: 'print-window';
    }
  | {
      content: string;
      filename: string;
      kind: 'download';
      mimeType: string;
    };

export type PrototypeOnlySupportExportDeliveryResult =
  | 'delivered'
  | 'popup-blocked';

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[character] ?? character,
  );
}

function createSectionsHtml(supportPackage: SupportPackage) {
  return supportPackage.sections
    .map(
      (section) =>
        `<h2>${escapeHtml(section.code)} ${escapeHtml(section.title)}</h2><p>${escapeHtml(section.summary)}</p>`,
    )
    .join('');
}

export function createPrototypeOnlySupportExportArtifact({
  exportedAt = new Date().toISOString(),
  format,
  purpose,
  supportPackage,
}: CreatePrototypeOnlySupportExportArtifactInput): PrototypeOnlySupportExportArtifact {
  const safeName = supportPackage.title.replace(/[\\/:*?"<>|]/g, '-');
  const sectionsHtml = createSectionsHtml(supportPackage);

  if (format === 'pdf') {
    return {
      content: `<!doctype html>
                <html lang="zh-CN"><head><meta charset="utf-8" />
                <title>${escapeHtml(supportPackage.title)}</title>
                <style>
                  body{font-family:Arial,"PingFang SC",sans-serif;color:#17324d;padding:40px;line-height:1.6}
                  h1{color:#2f73da} h2{border-bottom:1px solid #dce8f0;padding-bottom:8px}
                  .meta{background:#f3f9ff;border:1px solid #dce8f0;border-radius:12px;padding:16px}
                  @media print{button{display:none}}
                </style></head><body>
                <h1>${escapeHtml(supportPackage.title)}</h1>
                <div class="meta">版本：${escapeHtml(supportPackage.version)}<br/>
                课程：${escapeHtml(supportPackage.course)}<br/>
                用途：${escapeHtml(purpose)}</div>
                ${sectionsHtml}
                <button onclick="window.print()">打印 / 保存为 PDF</button>
                </body></html>`,
      kind: 'print-window',
    };
  }

  if (format === 'docx') {
    // 当前原型保持既有交付语义：DOCX 仍是可被 Word 打开的 HTML .doc 文件。
    return {
      content: `<!doctype html><html><head><meta charset="utf-8"></head><body><h1>${escapeHtml(supportPackage.title)}</h1>${sectionsHtml}</body></html>`,
      filename: `${safeName}.doc`,
      kind: 'download',
      mimeType: 'application/msword;charset=utf-8',
    };
  }

  // 当前“证据压缩包”仍交付 JSON 清单，正式压缩归档由 reporting 后端负责。
  return {
    content: JSON.stringify(
      {
        exportedAt,
        format,
        package: supportPackage,
        purpose,
      },
      null,
      2,
    ),
    filename: `${safeName}-evidence-manifest.json`,
    kind: 'download',
    mimeType: 'application/json;charset=utf-8',
  };
}

export function deliverPrototypeOnlySupportExportArtifact(
  artifact: PrototypeOnlySupportExportArtifact,
): PrototypeOnlySupportExportDeliveryResult {
  if (artifact.kind === 'print-window') {
    const reportWindow = window.open('', '_blank');

    if (!reportWindow) {
      return 'popup-blocked';
    }

    reportWindow.document.write(artifact.content);
    reportWindow.document.close();
    return 'delivered';
  }

  const url = URL.createObjectURL(
    new Blob([artifact.content], { type: artifact.mimeType }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = artifact.filename;
  anchor.click();
  URL.revokeObjectURL(url);
  return 'delivered';
}

export function deliverPrototypeOnlySupportPackageExport(
  input: CreatePrototypeOnlySupportExportArtifactInput,
) {
  return deliverPrototypeOnlySupportExportArtifact(
    createPrototypeOnlySupportExportArtifact(input),
  );
}
