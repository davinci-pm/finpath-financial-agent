import { OpenAICompatibleProvider } from "./openai-compatible";

/** DeepSeek Provider（OpenAI 兼容接口） */
export class DeepSeekProvider extends OpenAICompatibleProvider {
  constructor(config: {
    apiKey: string;
    baseUrl?: string;
    model?: string;
  }) {
    super("deepseek", {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl ?? "https://api.deepseek.com",
      model: config.model ?? "deepseek-v4-flash",
    });
  }
}
