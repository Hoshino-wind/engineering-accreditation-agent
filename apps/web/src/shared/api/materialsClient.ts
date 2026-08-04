import type {
  UploadedMaterial,
  UploadedMaterialCategory,
  UploadedMaterialFileType,
} from '../../entities/uploaded-material';
import { requestJson } from './http';

export interface MaterialApiResponse {
  id: string;
  fileName: string;
  fileType: string;
  category: string;
  uploadTime: string;
  uploadedBy: string;
  status: string;
  fileSize: string;
  fileUrl: string;
  course?: string | null;
  extractedNodeCount?: number | null;
  candidatesCreated: number;
  failureReason?: string | null;
  parserVersion?: string | null;
  parseStrategy?: string | null;
}

export interface ParsedMaterialNodeResponse {
  id: string;
  kind: string;
  code: string;
  name: string;
  description: string;
  confidence: number;
  sourceExcerpt: string;
}

export interface MaterialParseApiResponse {
  material: MaterialApiResponse;
  extractedNodes: ParsedMaterialNodeResponse[];
  candidatesCreated: number;
  candidates: unknown[];
  parseArtifacts: Record<string, unknown>;
}

export interface MaterialVersionApiResponse {
  id: string;
  materialId: string;
  versionNo: number;
  fileName: string;
  fileType: string;
  fileSize: string;
  storageUri: string;
  checksum: string;
  parserVersion?: string | null;
  parseStrategy?: string | null;
  createdAt: string;
  parseArtifacts: Record<string, unknown>;
}

export interface OcrRuntimeStatus {
  available: boolean;
  status: string;
  engine: string;
  version?: string | null;
  languages: string[];
  message: string;
}

export async function listUploadedMaterials(): Promise<UploadedMaterial[]> {
  const rows = await requestJson<MaterialApiResponse[]>('/api/v1/materials');
  return rows.map(toUploadedMaterial);
}

export async function uploadMaterialFile(
  file: File,
  category: UploadedMaterialCategory,
  course?: string,
): Promise<UploadedMaterial> {
  const contentBase64 = await fileToBase64(file);
  const row = await requestJson<MaterialApiResponse>('/api/v1/materials/upload', {
    body: JSON.stringify({
      fileName: file.name,
      category,
      course,
      contentBase64,
      contentType: file.type || 'application/octet-stream',
    }),
    method: 'POST',
  });
  return toUploadedMaterial(row);
}

export async function parseUploadedMaterial(
  materialId: string,
): Promise<MaterialParseApiResponse> {
  return requestJson<MaterialParseApiResponse>(
    `/api/v1/materials/${materialId}/parse`,
    { method: 'POST' },
  );
}

export async function listMaterialVersions(
  materialId: string,
): Promise<MaterialVersionApiResponse[]> {
  return requestJson<MaterialVersionApiResponse[]>(
    `/api/v1/materials/${materialId}/versions`,
  );
}

export async function getOcrRuntimeStatus(): Promise<OcrRuntimeStatus> {
  return requestJson<OcrRuntimeStatus>('/api/v1/materials/ocr/status');
}

export function toUploadedMaterial(row: MaterialApiResponse): UploadedMaterial {
  const normalizedType = normalizeFileType(row.fileType);
  return {
    id: row.id,
    fileName: row.fileName,
    fileType: normalizedType,
    category: row.category as UploadedMaterialCategory,
    course: row.course ?? undefined,
    uploadTime: row.uploadTime,
    uploadedBy: row.uploadedBy,
    status: normalizeStatus(row.status),
    fileSize: row.fileSize,
    fileUrl: row.fileUrl,
    extractedNodeCount: row.extractedNodeCount ?? undefined,
    failureReason: row.failureReason ?? undefined,
    parserVersion: row.parserVersion ?? undefined,
    parseStrategy: row.parseStrategy ?? undefined,
  };
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return window.btoa(binary);
}

function normalizeFileType(value: string): UploadedMaterialFileType {
  if (value === 'docx' || value === 'xlsx' || value === 'pdf' || value === 'txt') {
    return value;
  }
  return 'pdf';
}

function normalizeStatus(value: string): UploadedMaterial['status'] {
  if (
    value === 'pending' ||
    value === 'extracting' ||
    value === 'extracted' ||
    value === 'failed'
  ) {
    return value;
  }
  return 'pending';
}
