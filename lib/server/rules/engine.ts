/**
 * 确定性规则引擎（手册 §9）
 * 负责金融硬约束；大模型只负责解释和组织，不自由生成投资比例。
 */

export type Horizon = "anytime" | "within_1y" | "1_to_3y" | "after_3y";
export type IncomeStability = "low" | "medium" | "high";
export type LossTolerance = "none" | "small" | "medium";

export type DiagnosisInput = {
  amountRange: { min: number; max: number };
  expectedUseHorizon?: Horizon;
  emergencyFundMonths?: number;
  incomeStability?: IncomeStability;
  highInterestDebt?: boolean;
  lossTolerance?: LossTolerance;
};

export type BucketKey = "reserve" | "stable" | "learning";

export type RuleBucket = {
  key: BucketKey;
  percentageRange: [number, number];
  rationaleCodes: string[];
};

export type RuleResult = {
  hardConstraints: string[];
  liquidityPriority: "high" | "medium" | "low";
  debtPriority: "first" | "parallel" | "none";
  buckets: RuleBucket[];
  missingCriticalFields: Array<keyof DiagnosisInput | string>;
};

const RATIONALE: Record<string, string> = {
  short_horizon: "期限不足 1 年，优先保证流动性",
  medium_horizon: "1～3 年期限，可配置稳健类工具",
  long_horizon: "3 年以上期限，可承担一定波动",
  no_emergency: "应急储备不足 3 个月，需优先补足",
  has_emergency: "应急储备充足，可释放更多资金",
  high_debt: "存在高息负债，偿债优先级最高",
  no_debt: "无高息负债",
  loss_none: "不能承受本金波动",
  loss_small: "可承受小幅波动",
};

/** 计算资金期限/储备/负债/波动容忍对桶区间的影响（确定性） */
export function runRules(input: DiagnosisInput): RuleResult {
  const missing: RuleResult["missingCriticalFields"] = [];
  if (!input.expectedUseHorizon) missing.push("expectedUseHorizon");
  if (input.emergencyFundMonths == null) missing.push("emergencyFundMonths");
  if (input.incomeStability == null) missing.push("incomeStability");
  if (input.highInterestDebt == null) missing.push("highInterestDebt");
  if (input.lossTolerance == null) missing.push("lossTolerance");

  const hardConstraints: string[] = [];
  const rationaleCodes: string[] = [];

  /* 期限 → 流动性 */
  const horizon = input.expectedUseHorizon ?? "within_1y";
  if (horizon === "anytime" || horizon === "within_1y") {
    hardConstraints.push("短期资金（1 年内可能动用）不可投入有锁定期的产品");
    rationaleCodes.push("short_horizon");
  } else if (horizon === "1_to_3y") {
    rationaleCodes.push("medium_horizon");
  } else {
    rationaleCodes.push("long_horizon");
  }

  /* 应急储备 */
  const emergency = input.emergencyFundMonths ?? 0;
  if (emergency < 3) {
    hardConstraints.push("应急储备不足 3 个月，先补足应急资金，再考虑其他配置");
    rationaleCodes.push("no_emergency");
  } else {
    rationaleCodes.push("has_emergency");
  }

  /* 高息负债 */
  const hasHighDebt = input.highInterestDebt ?? false;
  const debtPriority: RuleResult["debtPriority"] = hasHighDebt ? "first" : "none";
  if (hasHighDebt) {
    hardConstraints.push("存在高息负债时，优先偿还负债，不建议同时加大投资");
    rationaleCodes.push("high_debt");
  } else {
    rationaleCodes.push("no_debt");
  }

  /* 波动容忍 */
  const loss = input.lossTolerance ?? "small";
  if (loss === "none") {
    hardConstraints.push("不能承受本金波动的资金，不进入高波动资产");
    rationaleCodes.push("loss_none");
  } else if (loss === "small") {
    rationaleCodes.push("loss_small");
  }

  const liquidityPriority: RuleResult["liquidityPriority"] =
    horizon === "anytime" || horizon === "within_1y" || emergency < 3
      ? "high"
      : horizon === "after_3y" && emergency >= 3
        ? "low"
        : "medium";

  /* 桶区间（确定性） */
  let reserve: [number, number] = [35, 45];
  let stable: [number, number] = [30, 45];
  let learning: [number, number] = [15, 25];

  if (liquidityPriority === "high") {
    reserve = [45, 55];
    learning = [0, 10];
  }
  if (debtPriority === "first") {
    reserve = [30, 40];
    learning = [0, 5];
  }
  if (loss === "none") {
    learning = [0, 5];
    stable = [45, 60];
  }
  if (horizon === "after_3y" && emergency >= 3) {
    learning = [20, 30];
    reserve = [25, 35];
  }

  const emgCode = emergency < 3 ? "no_emergency" : "has_emergency";
  const horizonCode =
    horizon === "anytime" || horizon === "within_1y"
      ? "short_horizon"
      : horizon === "1_to_3y"
        ? "medium_horizon"
        : "long_horizon";
  const lossCode = loss === "none" ? "loss_none" : loss === "small" ? "loss_small" : "medium_horizon";

  const buckets: RuleBucket[] = [
    { key: "reserve", percentageRange: reserve, rationaleCodes: [emgCode, hasHighDebt ? "high_debt" : "no_debt"].filter(Boolean) },
    { key: "stable", percentageRange: stable, rationaleCodes: [horizonCode] },
    { key: "learning", percentageRange: learning, rationaleCodes: [lossCode] },
  ];

  return {
    hardConstraints: Array.from(new Set(hardConstraints)),
    liquidityPriority,
    debtPriority,
    buckets,
    missingCriticalFields: missing,
  };
}

/** 从澄清答案构造规则输入 */
export function buildDiagnosisInput(
  amountRange: { min: number; max: number },
  answers: Record<string, string>,
): DiagnosisInput {
  return {
    amountRange,
    expectedUseHorizon: answers.expectedUseHorizon as Horizon | undefined,
    emergencyFundMonths: answers.emergencyFundMonths
      ? Number(answers.emergencyFundMonths)
      : undefined,
    incomeStability: answers.incomeStability as IncomeStability | undefined,
    highInterestDebt: answers.highInterestDebt === undefined
      ? undefined
      : answers.highInterestDebt === "true",
    lossTolerance: answers.lossTolerance as LossTolerance | undefined,
  };
}

export const rationaleText = (code: string): string => RATIONALE[code] ?? code;
