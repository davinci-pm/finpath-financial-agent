import { OpenAICompatibleProvider } from "./openai-compatible";

/** OpenAI Provider（OpenAI 兼容接口，备用文本模型） */
export class OpenAIProvider extends OpenAICompatibleProvider {
  constructor(config: {
    apiKey: string;
    baseUrl?: string;
    model: string;
  }) {
    super("openai", {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl ?? "https://api.openai.com/v1",
      model: config.model,
    });
  }
}
