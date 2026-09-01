import { z } from "zod";

/**
 * API 输入 Zod Schema（阶段 3）
 * 金额一律为整数人民币元；禁止银行卡号、密码、验证码字段。
 */

const AssetInputBase = z.object({
  kind: z.enum(["asset", "liability", "goal"]),
  category: z.string().min(1).max(40),
  label: z.string().min(1).max(80),
  amountMin: z.number().int().positive().optional(),
  amountMax: z.number().int().positive().optional(),
  amountExact: z.number().int().positive().optional(),
  currency: z.literal("CNY").default("CNY"),
  purpose: z.string().max(80).optional(),
  maturityDate: z.string().max(40).optional(),
  liquidity: z.string().max(80).optional(),
  note: z.string().max(200).optional(),
});

export const AssetInputSchema = AssetInputBase.refine(
  (v) => v.amountExact != null || (v.amountMin != null && v.amountMax != null),
  { message: "必须提供精确金额或金额区间" },
).refine(
  (v) => {
    if (v.amountMin != null && v.amountMax != null) return v.amountMin <= v.amountMax;
    return true;
  },
  { message: "金额下限不能大于上限" },
);

/** 更新场景：部分字段，不要求金额必填 */
export const AssetUpdateSchema = AssetInputBase.partial();

export const TaskStepInputSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(300).optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  officialEntry: z.string().max(200).optional(),
});

export const CreateTaskSchema = z.object({
  sourceType: z.enum(["plan", "document", "route", "manual"]),
  sourceId: z.string().min(1).max(80),
  title: z.string().min(1).max(120),
  summary: z.string().max(300).optional(),
  nextAction: z.string().max(120).optional(),
  steps: z.array(TaskStepInputSchema).max(20).optional(),
});

export const UpdateTaskStatusSchema = z.object({
  status: z.enum(["in_progress", "pending", "completed"]),
});

export const TransactionInputSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number().int().positive().max(1_000_000_000),
  category: z.string().trim().min(1).max(40),
  description: z.string().trim().max(120).default(""),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式应为 YYYY-MM-DD"),
  source: z.enum(["manual", "csv"]).default("manual"),
});

export const TransactionBatchSchema = z.object({
  transactions: z.array(TransactionInputSchema).min(1).max(500),
});

export const ScenarioInputSchema = z.object({
  initialCash: z.number().int().min(0).max(10_000_000_000),
  monthlyIncome: z.number().int().min(0).max(1_000_000_000),
  monthlyExpense: z.number().int().min(0).max(1_000_000_000),
  oneTimeExpense: z.number().int().min(0).max(10_000_000_000),
  months: z.number().int().min(1).max(120),
});
