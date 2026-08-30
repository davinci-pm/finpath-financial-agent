import { describe, expect, it } from "vitest";
import { buildDiagnosisInput, runRules } from "@/lib/server/rules/engine";

/**
 * 规则引擎确定性测试：相同输入 → 相同输出；关键边界覆盖（手册 §15.1）。
 */

describe("规则引擎 · 期限与流动性", () => {
  it("短期限（within_1y）→ 高流动性 + 硬约束", () => {
    const r = runRules({
      amountRange: { min: 30000, max: 30000 },
      expectedUseHorizon: "within_1y",
      emergencyFundMonths: 6,
      highInterestDebt: false,
      lossTolerance: "small",
    });
    expect(r.liquidityPriority).toBe("high");
    expect(r.hardConstraints.some((h) => h.includes("短期资金"))).toBe(true);
    const reserve = r.buckets.find((b) => b.key === "reserve");
    expect(reserve?.percentageRange).toEqual([45, 55]);
  });

  it("长期限 + 充足储备 → 低流动性，学习区可到 30%", () => {
    const r = runRules({
      amountRange: { min: 10000, max: 50000 },
      expectedUseHorizon: "after_3y",
      emergencyFundMonths: 8,
      highInterestDebt: false,
      lossTolerance: "medium",
    });
    expect(r.liquidityPriority).toBe("low");
    const learning = r.buckets.find((b) => b.key === "learning");
    expect(learning?.percentageRange).toEqual([20, 30]);
  });
});

describe("规则引擎 · 应急储备与负债", () => {
  it("无应急储备 → 硬约束补足应急 + reserve 上调", () => {
    const r = runRules({
      amountRange: { min: 30000, max: 30000 },
      expectedUseHorizon: "1_to_3y",
      emergencyFundMonths: 0,
      highInterestDebt: false,
      lossTolerance: "small",
    });
    expect(r.hardConstraints.some((h) => h.includes("应急储备不足 3 个月"))).toBe(true);
    const reserve = r.buckets.find((b) => b.key === "reserve");
    expect(reserve?.percentageRange[0]).toBeGreaterThanOrEqual(45);
  });

  it("高息负债 → debtPriority=first + 学习区受限", () => {
    const r = runRules({
      amountRange: { min: 30000, max: 30000 },
      expectedUseHorizon: "1_to_3y",
      emergencyFundMonths: 4.5,
      highInterestDebt: true,
      lossTolerance: "small",
    });
    expect(r.debtPriority).toBe("first");
    expect(r.hardConstraints.some((h) => h.includes("优先偿还"))).toBe(true);
    const learning = r.buckets.find((b) => b.key === "learning");
    expect(learning?.percentageRange[1]).toBeLessThanOrEqual(5);
  });
});

describe("规则引擎 · 波动容忍与缺失字段", () => {
  it("不能承受波动 → 学习区 0-5%", () => {
    const r = runRules({
      amountRange: { min: 30000, max: 30000 },
      expectedUseHorizon: "1_to_3y",
      emergencyFundMonths: 6,
      highInterestDebt: false,
      lossTolerance: "none",
    });
    const learning = r.buckets.find((b) => b.key === "learning");
    expect(learning?.percentageRange).toEqual([0, 5]);
    expect(r.hardConstraints.some((h) => h.includes("不能承受本金波动"))).toBe(true);
  });

  it("缺失字段全部列出", () => {
    const r = runRules({ amountRange: { min: 1000, max: 1000 } });
    for (const key of [
      "expectedUseHorizon",
      "emergencyFundMonths",
      "incomeStability",
      "highInterestDebt",
      "lossTolerance",
    ]) {
      expect(r.missingCriticalFields).toContain(key);
    }
  });

  it("相同输入产生相同输出（可复现）", () => {
    const input = {
      amountRange: { min: 30000, max: 30000 },
      expectedUseHorizon: "1_to_3y" as const,
      emergencyFundMonths: 4.5,
      highInterestDebt: false,
      lossTolerance: "small" as const,
    };
    const a = runRules(input);
    const b = runRules(input);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("buildDiagnosisInput 正确解析澄清答案", () => {
    const input = buildDiagnosisInput(
      { min: 30000, max: 30000 },
      {
        expectedUseHorizon: "1_to_3y",
        emergencyFundMonths: "4.5",
        highInterestDebt: "false",
        lossTolerance: "small",
      },
    );
    expect(input.expectedUseHorizon).toBe("1_to_3y");
    expect(input.emergencyFundMonths).toBe(4.5);
    expect(input.highInterestDebt).toBe(false);
  });
});
