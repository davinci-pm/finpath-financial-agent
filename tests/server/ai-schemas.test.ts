import { describe, expect, it } from "vitest";
import { ActionPlanSchema, ScenarioSchema } from "@/lib/server/ai/schemas";
import { MockModelProvider } from "@/lib/server/ai/mock";

/**
 * AI Schema 校验测试：成功、失败、截断；模型输出必须通过 Zod（手册 §15.1）。
 */

const VALID_PLAN = {
  conclusion: "这笔钱暂时不适合全部进入高波动资产",
  summary: "根据 1～3 年资金期限，建议先拆分资金用途。",
  buckets: [
    { key: "reserve", label: "生活缓冲区", percentage: 40, action: "确认应急资金目标" },
    { key: "stable", label: "稳健了解区", percentage: 40, action: "了解国债" },
    { key: "learning", label: "小额学习区", percentage: 20, action: "完成入门卡" },
  ],
  nextActions: [{ title: "确认应急资金目标", timeframe: "本周" }],
  risks: ["市场波动可能导致本金变化"],
  sourceIds: ["source-emergency-fund"],
  disclaimer: "行动教育建议，不构成具体投资推荐。",
};

describe("ActionPlanSchema", () => {
  it("合法输出通过", () => {
    expect(ActionPlanSchema.safeParse(VALID_PLAN).success).toBe(true);
  });

  it("桶数量不足 3 个时失败", () => {
    const bad = { ...VALID_PLAN, buckets: VALID_PLAN.buckets.slice(0, 2) };
    expect(ActionPlanSchema.safeParse(bad).success).toBe(false);
  });

  it("百分比超出 0-100 时失败", () => {
    const bad = {
      ...VALID_PLAN,
      buckets: VALID_PLAN.buckets.map((b, i) =>
        i === 0 ? { ...b, percentage: 120 } : b,
      ),
    };
    expect(ActionPlanSchema.safeParse(bad).success).toBe(false);
  });

  it("conclusion 超长（>80 字）时失败", () => {
    const bad = { ...VALID_PLAN, conclusion: "长".repeat(81) };
    expect(ActionPlanSchema.safeParse(bad).success).toBe(false);
  });
});

describe("ScenarioSchema", () => {
  it("合法场景识别通过", () => {
    const ok = ScenarioSchema.safeParse({
      scenario: "money_plan",
      confidence: 0.9,
      knownFacts: { amountRange: { min: 30000, max: 30000 } },
      missingCriticalFields: ["expectedUseHorizon"],
      safetyFlags: [],
    });
    expect(ok.success).toBe(true);
  });

  it("非法场景枚举失败", () => {
    const bad = ScenarioSchema.safeParse({
      scenario: "stock_picking",
      confidence: 0.9,
      knownFacts: {},
      missingCriticalFields: [],
      safetyFlags: [],
    });
    expect(bad.success).toBe(false);
  });
});

describe("MockModelProvider（测试零 Token 消耗）", () => {
  it("scenario-v1 输出可通过 ScenarioSchema", async () => {
    const provider = new MockModelProvider();
    const raw = await provider.complete([
      { role: "system", content: "识别用户问题属于哪个场景" },
      { role: "user", content: "我有 3 万元闲钱" },
    ]);
    expect(ScenarioSchema.safeParse(JSON.parse(raw)).success).toBe(true);
  });

  it("plan-explanation-v1 输出可通过 ActionPlanSchema", async () => {
    const provider = new MockModelProvider();
    const raw = await provider.complete([
      { role: "system", content: "规则引擎给出的硬约束" },
      { role: "user", content: "规则结果" },
    ]);
    const parsed = JSON.parse(raw);
    expect(ActionPlanSchema.safeParse(parsed).success).toBe(true);
    const total = parsed.buckets.reduce((s: number, b: { percentage: number }) => s + b.percentage, 0);
    expect(total).toBe(100);
  });
});
