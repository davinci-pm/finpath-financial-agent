import type { DocumentAnalyzer } from "./analyzer";
import { MockDocumentAnalyzer } from "./mock-analyzer";
import { OpenAIVisionDocumentAnalyzer } from "./openai-vision-analyzer";

/**
 * DocumentAnalyzer 工厂（独立接口，与文本模型解耦）。
 * 优先级：AI_DOCUMENT_PROVIDER=openai 且有 OPENAI_API_KEY → OpenAI 视觉；
 * 否则回退 MockDocumentAnalyzer（明确标记，供本地/CI 验证链路）。
 */
export function createDocumentAnalyzer(): DocumentAnalyzer {
  const provider = process.env.AI_DOCUMENT_PROVIDER ?? "openai";
  const apiKey = process.env.OPENAI_API_KEY;

  if (provider === "openai" && apiKey) {
    return new OpenAIVisionDocumentAnalyzer({
      apiKey,
      model: process.env.OPENAI_MODEL_DOCUMENT ?? "gpt-4o",
    });
  }

  console.warn(
    "[documents] 未配置视觉模型 Key（OPENAI_API_KEY），回退 MockDocumentAnalyzer。",
  );
  return new MockDocumentAnalyzer();
}
