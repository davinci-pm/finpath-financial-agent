import type { ModelMessage, ModelCallOptions, ModelProvider } from "./types";

export type OpenAICompatibleConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

/**
 * OpenAI 兼容 Chat Completions Provider（DeepSeek 官方 API 即此格式）。
 * 支持 response_format json_object（JSON 模式）。
 */
export class OpenAICompatibleProvider implements ModelProvider {
  readonly name: string;
  readonly model: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(name: string, config: OpenAICompatibleConfig) {
    this.name = name;
    this.model = config.model;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
  }

  async complete(
    messages: ModelMessage[],
    opts?: ModelCallOptions,
  ): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: opts?.temperature ?? 0.3,
        ...(opts?.jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`${this.name} 请求失败（${res.status}）: ${body.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error(`${this.name} 返回空内容`);
    }
    return content;
  }
}
