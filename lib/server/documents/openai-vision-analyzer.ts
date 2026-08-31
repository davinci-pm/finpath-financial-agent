import { z } from "zod";
import { extractText, getDocumentProxy } from "unpdf";
import type { DocumentField } from "@/lib/types";
import type { AnalyzeInput, DocumentAnalyzer } from "./analyzer";

const VisionFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.string(),
  source: z.enum(["file", "ai", "unknown"]),
  confidence: z.number().min(0).max(1),
  page: z.number().int().min(1).nullable().optional(),
  snippet: z.string().optional(),
});

const VisionOutputSchema = z.object({
  fields: z.array(VisionFieldSchema),
});

const SYSTEM_PROMPT = [
  "你是 FinPath 的金融产品文件解析器。",
  "从用户上传的 PDF/图片中提取金融产品关键字段。",
  "每个字段必须标注：source（file=文件中明确出现 / ai=AI 推断 / unknown=无法识别）、confidence（0-1）、page（页码，图片为 null）、snippet（原文片段，尽量短）。",
  "只提取与产品相关的字段：产品名称、产品类型、期限、展示收益及其性质、风险等级、是否保本、提前退出限制、起购金额、费用（管理费/销售费/赎回费）、信息缺失或冲突。",
  "不要虚构字段；无法识别时 value 填“未识别”，source 填 unknown。",
  "严格返回 JSON：{\"fields\":[{\"key\":\"...\",\"label\":\"...\",\"value\":\"...\",\"source\":\"file|ai|unknown\",\"confidence\":0.9,\"page\":1,\"snippet\":\"...\"}]}",
].join("\n");

/**
 * OpenAIVisionDocumentAnalyzer：直传视觉模型提取字段。
 * 需要 OPENAI_API_KEY；无 Key 时由工厂回退 MockDocumentAnalyzer。
 */
export class OpenAIVisionDocumentAnalyzer implements DocumentAnalyzer {
  readonly name: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(config: {
    apiKey: string;
    model?: string;
    baseUrl?: string;
    providerName?: string;
  }) {
    this.apiKey = config.apiKey;
    this.model = config.model ?? "gpt-4o";
    this.baseUrl = (config.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "");
    this.name = config.providerName ?? "openai-vision";
  }

  async analyze(input: AnalyzeInput): Promise<DocumentField[]> {
    const userContent = await this.buildUserContent(input);

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: userContent,
          },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`视觉模型请求失败（${res.status}）: ${body.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("视觉模型返回空内容");

    const parsed = VisionOutputSchema.safeParse(parseJson(content));
    if (!parsed.success) {
      throw new Error(`视觉输出未通过 Schema 校验: ${parsed.error.message}`);
    }
    return parsed.data.fields.map((f) => ({
      key: f.key,
      label: f.label,
      value: f.value,
      source: f.source,
      confidence: f.confidence,
      page: f.page ?? null,
      snippet: f.snippet ?? "",
    }));
  }

  private async buildUserContent(input: AnalyzeInput) {
    if (input.mimeType !== "application/pdf") {
      const dataUrl = `data:${input.mimeType};base64,${input.buffer.toString("base64")}`;
      return [
        { type: "text", text: `文件名：${input.fileName}。请提取产品字段。` },
        { type: "image_url", image_url: { url: dataUrl, detail: "original" } },
      ];
    }

    const pdf = await Promise.race([
      getDocumentProxy(new Uint8Array(input.buffer), { maxImageSize: 16_777_216 }),
      rejectAfter<never>(20_000, "PDF 解析超时"),
    ]);
    if (pdf.numPages > 50) throw new Error("PDF 页数超过 50 页限制");
    const result = await Promise.race([
      extractText(pdf, { mergePages: false }),
      rejectAfter<never>(25_000, "PDF 文本提取超时"),
    ]);
    const pages = Array.isArray(result.text) ? result.text : [result.text];
    const text = pages
      .map((page, index) => `【第 ${index + 1} 页】\n${page}`)
      .join("\n\n")
      .slice(0, 160_000)
      .trim();
    if (text.length < 20) {
      throw new Error("PDF 未提取到可识别文字；扫描件请先转换为 JPG 或 PNG 上传");
    }
    return [
      {
        type: "text",
        text: `文件名：${input.fileName}。以下是按页提取的 PDF 原文，请提取产品字段并保留页码依据。\n\n${text}`,
      },
    ];
  }
}

function rejectAfter<T>(milliseconds: number, message: string): Promise<T> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), milliseconds);
  });
}

function parseJson(value: string): unknown {
  const normalized = value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(normalized);
}
