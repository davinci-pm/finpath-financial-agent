/**
 * ModelProvider 接口（手册 §4.3：所有模型调用必须经过 Provider Adapter）
 * 业务组件/API 禁止直接调用任何模型 SDK。
 */

export type ModelRole = "system" | "user" | "assistant";

export type ModelMessage = {
  role: ModelRole;
  content: string;
};

/** 模型调用记录（不记录敏感原文，仅元数据） */
export type ModelCallRecord = {
  provider: string;
  model: string;
  promptVersion: string;
  latencyMs: number;
  tokenUsage?: { input: number; output: number };
  schemaValid: boolean;
  attempt: number;
};

export type ModelCallOptions = {
  /** JSON 模式（强制模型输出 JSON） */
  jsonMode?: boolean;
  temperature?: number;
};

export type ModelResult<T> = {
  data: T;
  record: ModelCallRecord;
};

export interface ModelProvider {
  readonly name: string;
  readonly model: string;
  /** 输出结构化 JSON 并返回原始文本（供 Zod 校验） */
  complete(messages: ModelMessage[], opts?: ModelCallOptions): Promise<string>;
}
