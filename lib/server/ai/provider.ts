import { DeepSeekProvider } from "./deepseek";
import { MockModelProvider } from "./mock";
import { OpenAIProvider } from "./openai";
import type { ModelProvider } from "./types";

export type ProviderKind = "deepseek" | "openai" | "mock";

/**
 * Provider 工厂：读取 AI_TEXT_PROVIDER（默认 deepseek）。
 * - deepseek：需 DEEPSEEK_API_KEY
 * - openai：需 OPENAI_API_KEY 与 OPENAI_MODEL_TEXT
 * - 未配置 Key 时回退 Mock（明确标记，供本地/CI 使用）
 */
export function createTextProvider(): ModelProvider {
  const kind = (process.env.AI_TEXT_PROVIDER ?? "deepseek") as ProviderKind;

  if (kind === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL_TEXT;
    if (apiKey && model) {
      return new OpenAIProvider({ apiKey, model });
    }
  }

  if (kind === "deepseek") {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (apiKey) {
      return new DeepSeekProvider({
        apiKey,
        baseUrl: process.env.DEEPSEEK_BASE_URL,
        model: process.env.DEEPSEEK_MODEL,
      });
    }
  }

  if (process.env.APP_ENV === "production") {
    throw new Error("生产环境未配置可用的文本模型");
  }
  console.warn("[ai] 未配置可用文本模型 Key，回退 MockModelProvider（不消耗 Token）。");
  return new MockModelProvider();
}
