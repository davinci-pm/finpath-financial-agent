import { describe, expect, it } from "vitest";
import {
  buildDiagnosisInput,
  runRules,
  type Horizon,
  type IncomeStability,
  type LossTolerance,
} from "@/lib/server/rules/engine";

/**
 * 金融规则组合回归：覆盖 4×4×2×3×3 = 288 组用户条件。
 * 这些测试不判断某个具体产品，只校验规则引擎在全部输入组合下的结构、安全边界和可复现性。
 */
const horizons: Horizon[] = ["anytime", "within_1y", "1_to_3y", "after_3y"];
const emergencyMonths = [0, 2, 4.5, 8];
const debtFlags = [false, true];
const lossTolerances: LossTolerance[] = ["none", "small", "medium"];
const incomeStabilities: IncomeStability[] = ["low", "medium", "high"];

const combinations = horizons.flatMap((expectedUseHorizon) =>
  emergencyMonths.flatMap((emergencyFundMonths) =>
    debtFlags.flatMap((highInterestDebt) =>
      lossTolerances.flatMap((lossTolerance) =>
        incomeStabilities.map((incomeStability) => ({
          expectedUseHorizon,
          emergencyFundMonths,
          highInterestDebt,
          lossTolerance,
          incomeStability,
        })),
      ),
    ),
  ),
);

describe("规则引擎 · 288 组全组合安全不变量", () => {
  it.each(combinations)(
    "$expectedUseHorizon / $emergencyFundMonths月 / debt=$highInterestDebt / $lossTolerance / income=$incomeStability",
    (input) => {
      const result = runRules({ amountRange: { min: 1, max: 100_000_000 }, ...input });

      expect(result.missingCriticalFields).toEqual([]);
      expect(result.buckets.map((bucket) => bucket.key)).toEqual([
        "reserve",
        "stable",
        "learning",
      ]);
      expect(new Set(result.buckets.map((bucket) => bucket.key)).size).toBe(3);

      for (const bucket of result.buckets) {
        const [min, max] = bucket.percentageRange;
        expect(Number.isFinite(min)).toBe(true);
        expect(Number.isFinite(max)).toBe(true);
        expect(min).toBeGreaterThanOrEqual(0);
        expect(max).toBeLessThanOrEqual(100);
        expect(min).toBeLessThanOrEqual(max);
        expect(bucket.rationaleCodes.length).toBeGreaterThan(0);
      }

      // 同一输入必须产生完全一致的规则结果，避免金融建议不可复现。
      expect(runRules({ amountRange: { min: 1, max: 100_000_000 }, ...input })).toEqual(
        result,
      );
    },
  );
});

describe("规则引擎 · 已知业务缺口的可执行复现", () => {
  it("跳过问题不应被强转为非法枚举、NaN 或虚假的确定答案", () => {
    const input = buildDiagnosisInput(
      { min: 30_000, max: 30_000 },
      {
        expectedUseHorizon: "skipped",
        emergencyFundMonths: "skipped",
        incomeStability: "skipped",
        highInterestDebt: "skipped",
        lossTolerance: "skipped",
      },
    );

    expect(input.expectedUseHorizon).toBeUndefined();
    expect(input.emergencyFundMonths).toBeUndefined();
    expect(input.incomeStability).toBeUndefined();
    expect(input.highInterestDebt).toBeUndefined();
    expect(input.lossTolerance).toBeUndefined();
  });

  it("收入稳定性从低到高时，规则结果应有可解释的差异", () => {
    const shared = {
      amountRange: { min: 30_000, max: 30_000 },
      expectedUseHorizon: "1_to_3y" as const,
      emergencyFundMonths: 4.5,
      highInterestDebt: false,
      lossTolerance: "small" as const,
    };
    const lowIncomeStability = runRules({ ...shared, incomeStability: "low" });
    const highIncomeStability = runRules({ ...shared, incomeStability: "high" });

    expect(lowIncomeStability).not.toEqual(highIncomeStability);
  });
});
