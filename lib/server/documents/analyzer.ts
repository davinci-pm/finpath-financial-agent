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
  return ACCEPTED_EXTENSIONS.has(ext) || ACCEPTED_MIME.has(mimeType);
}

export function maxUploadBytes(): number {
  const mb = Number(process.env.MAX_UPLOAD_MB ?? 20);
  return mb * 1024 * 1024;
}
