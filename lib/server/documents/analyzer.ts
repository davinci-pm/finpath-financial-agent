import type { DocumentField } from "@/lib/types";

/**
 * DocumentAnalyzer 独立接口（手册 §11 / 执行提示词 §6）
 * 与文本模型解耦：PDF/图片解析通过此接口，支持 OpenAI 视觉模型与未来 DeepSeek Vision / Docling 适配。
 * 输出字段必须包含：来源类型、置信度、页码、原文片段。
 */

export type AnalyzeInput = {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
};

export interface DocumentAnalyzer {
  readonly name: string;
  analyze(input: AnalyzeInput): Promise<DocumentField[]>;
}

export const ACCEPTED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
]);

export const ACCEPTED_EXTENSIONS = new Set([".pdf", ".png", ".jpg", ".jpeg"]);

export function isAcceptedFile(fileName: string, mimeType: string): boolean {
  const ext = `.${fileName.split(".").pop()?.toLowerCase() ?? ""}`;
  if (!ACCEPTED_EXTENSIONS.has(ext) || !ACCEPTED_MIME.has(mimeType)) return false;
  if (ext === ".pdf") return mimeType === "application/pdf";
  if (ext === ".png") return mimeType === "image/png";
  return mimeType === "image/jpeg" || mimeType === "image/jpg";
}

/** 用文件签名阻止只修改扩展名/MIME 的伪装文件。 */
export function hasAcceptedFileSignature(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length === 0) return false;
  if (mimeType === "application/pdf") {
    return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  }
  if (mimeType === "image/png") {
    return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  return false;
}

export function maxUploadBytes(): number {
  const mb = Number(process.env.MAX_UPLOAD_MB ?? 20);
  return mb * 1024 * 1024;
}
