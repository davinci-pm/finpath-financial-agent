import { z } from "zod";

/**
 * AI 结构化输出 Schema（手册 §10）
 * 所有模型输出必须通过 Zod 校验，失败只重试一次，再进入可恢复错误状态。
 */

export const ScenarioSchema = z.object({
  scenario: z.enum(["money_plan", "product_explain", "financial_route", "learning", "other"]),
  confidence: z.number().min(0).max(1),
  knownFacts: z.record(z.string(), z.unknown()),
  missingCriticalFields: z.array(z.string()),
  safetyFlags: z.array(z.string()),
});

export const ClarificationSchema = z.object({
  key: z.string(),
  question: z.string().max(60),
  reason: z.string().max(80),
  options: z.array(z.object({ value: z.string(), label: z.string() })).min(2).max(5),
  skippable: z.boolean(),
});

export const ActionPlanBucketSchema = z.object({
  key: z.enum(["reserve", "stable", "learning"]),
  label: z.string().max(40),
  percentage: z.number().min(0).max(100),
  action: z.string().max(80),
});

export const ActionPlanSchema = z.object({
  conclusion: z.string().max(80),
  summary: z.string().max(160),
  buckets: z.array(ActionPlanBucketSchema).length(3),
  nextActions: z.array(z.object({ title: z.string(), timeframe: z.string() })).max(5),
  risks: z.array(z.string()).max(5),
  sourceIds: z.array(z.string()),
  disclaimer: z.string(),
});

export type ScenarioOutput = z.infer<typeof ScenarioSchema>;
export type ClarificationOutput = z.infer<typeof ClarificationSchema>;
export type ActionPlanOutput = z.infer<typeof ActionPlanSchema>;
