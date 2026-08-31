import type { DocumentAnalyzer } from "./analyzer";
import { MockDocumentAnalyzer } from "./mock-analyzer";
import { OpenAIVisionDocumentAnalyzer } from "./openai-vision-analyzer";

/**
 * DocumentAnalyzer 工厂（独立接口，与文本模型解耦）。
 * 生产默认：DeepSeek V4 Flash Vision；本地无 Key 时回退 Mock。
 * 否则回退 MockDocumentAnalyzer（明确标记，供本地/CI 验证链路）。
 */
export function createDocumentAnalyzer(): DocumentAnalyzer {
  const provider = process.env.AI_DOCUMENT_PROVIDER ?? "deepseek";

  if (provider === "deepseek" && process.env.DEEPSEEK_API_KEY) {
    return new OpenAIVisionDocumentAnalyzer({
      apiKey: process.env.DEEPSEEK_API_KEY,
      model:
        process.env.DEEPSEEK_MODEL_DOCUMENT ??
        "deepseek-v4-flash-vision-exp",
      baseUrl: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
      providerName: "deepseek-v4-flash-vision",
    });
  }

  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    return new OpenAIVisionDocumentAnalyzer({
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL_DOCUMENT ?? "gpt-4o",
    });
  }

  if (process.env.APP_ENV === "production") {
    throw new Error("生产环境未配置可用的文档识别模型");
  }
  console.warn(
    "[documents] 未配置视觉模型 Key，回退 MockDocumentAnalyzer。",
  );
  return new MockDocumentAnalyzer();
}
