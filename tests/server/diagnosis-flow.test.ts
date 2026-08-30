import { beforeAll, describe, expect, it } from "vitest";
import { DemoRepository } from "@/lib/server/repository";
import {
  generatePlan,
  nextClarification,
  nextQuestionKey,
  recognizeScenario,
  sanitizeSourceIds,
  UnsafeOutputError,
  validatePlanSafety,
} from "@/lib/server/diagnosis-service";
import { getClarificationQuestion } from "@/lib/server/rules/questions";
import { runRules } from "@/lib/server/rules/engine";
import type { DiagnosisRecord } from "@/lib/types";

/**
 * AI 诊断链路集成测试（Mock Provider，零 Token）：
 * 场景识别 → 确定性澄清（一次一问）→ 规则引擎 → 模型解释 → 业务校验 → 保存计划。
 */
beforeAll(() => {
  process.env.AI_TEXT_PROVIDER = "mock";
});

const USER = "demo-user";

async function createFullyAnsweredSession(repo: DemoRepository): Promise<DiagnosisRecord> {
  const session = await repo.createDiagnosisSession(USER, {
    rawQuestion: "我有 3 万元闲钱，想稳一点也想学投资",
    scenarioType: "money_plan",
  });
  return repo.updateDiagnosisSession(USER, session.id, {
    answers: {
      expectedUseHorizon: "1_to_3y",
      emergencyFundMonths: "4.5",
      highInterestDebt: "false",
      lossTolerance: "small",
      incomeStability: "medium",
    },
  }) as Promise<DiagnosisRecord>;
}

describe("场景识别（Mock Provider）", () => {
  it("识别为 money_plan 且通过 Schema", async () => {
    const { scenario } = await recognizeScenario("我刚发了 3 万元年终奖，还有房贷，应该怎么安排？");
    expect(scenario.scenario).toBe("money_plan");
    expect(scenario.confidence).toBeGreaterThan(0);
    expect(Array.isArray(scenario.missingCriticalFields)).toBe(true);
  });
});

describe("澄清：一次只问一个问题", () => {
  it("新会话第一问为期限", async () => {
    const repo = new DemoRepository();
    const session = await repo.createDiagnosisSession(USER, {
      rawQuestion: "3 万元怎么安排？",
      scenarioType: "money_plan",
    });
    const q = nextClarification(session);
    expect(q?.key).toBe("expectedUseHorizon");
    expect(q).not.toBeNull();
  });

  it("按固定顺序推进，已答字段不再追问", async () => {
    const repo = new DemoRepository();
    let session = await repo.createDiagnosisSession(USER, {
      rawQuestion: "3 万元怎么安排？",
      scenarioType: "money_plan",
    });
    const order: string[] = [];
    let key = nextQuestionKey(session);
    while (key) {
      order.push(key);
      session = (await repo.updateDiagnosisSession(USER, session.id, {
        answers: { [key]: "skipped" },
      })) as DiagnosisRecord;
      key = nextQuestionKey(session);
    }
    expect(order).toEqual([
      "expectedUseHorizon",
      "emergencyFundMonths",
      "highInterestDebt",
      "lossTolerance",
      "incomeStability",
    ]);
  });

  it("每个关键字段都有对应问题模板（≤60 字问题、2-5 个选项）", () => {
    for (const key of ["expectedUseHorizon", "emergencyFundMonths", "highInterestDebt", "lossTolerance", "incomeStability"]) {
      const q = getClarificationQuestion(key);
      expect(q).not.toBeNull();
      expect(q!.question.length).toBeLessThanOrEqual(60);
      expect(q!.options.length).toBeGreaterThanOrEqual(2);
      expect(q!.options.length).toBeLessThanOrEqual(5);
      expect(q!.skippable).toBe(true);
    }
  });
});

describe("计划生成：规则先行，模型解释", () => {
  it("完整链路生成计划：桶合计 100、百分比在区间内、无收益承诺", async () => {
    const repo = new DemoRepository();
    const session = await createFullyAnsweredSession(repo);
    const plan = await generatePlan(repo, USER, session);

    const total = plan.buckets.reduce((s, b) => s + b.percentage, 0);
    expect(total).toBe(100);
    expect(plan.buckets.length).toBe(3);
    // 规则依据（确定性 rationale）必须存在
    expect(plan.rationale.length).toBeGreaterThan(0);
    expect(plan.sourceIds.every((id) => id.startsWith("source-"))).toBe(true);
    expect(plan.disclaimer).toContain("不构成具体投资推荐");
    // 可从 repo 读取已保存计划
    const fetched = await repo.getPlan(USER, plan.id);
    expect(fetched?.id).toBe(plan.id);
  });

  it("高息负债场景：区间收窄，Mock 按规则区间生成保守方案", async () => {
    const repo = new DemoRepository();
    const session = await repo.createDiagnosisSession(USER, {
      rawQuestion: "有信用卡分期，年终奖怎么安排？",
      scenarioType: "money_plan",
    });
    await repo.updateDiagnosisSession(USER, session.id, {
      answers: {
        expectedUseHorizon: "within_1y",
        emergencyFundMonths: "2",
        highInterestDebt: "true",
        lossTolerance: "none",
        incomeStability: "low",
      },
    });
    const plan = await generatePlan(repo, USER, session);
    expect(plan.hardConstraints.some((item) => item.includes("优先偿还负债"))).toBe(true);
    expect(plan.buckets.find((bucket) => bucket.key === "learning")?.percentage).toBeLessThanOrEqual(5);
    expect(plan.buckets.reduce((sum, bucket) => sum + bucket.percentage, 0)).toBe(100);
  });
});

describe("业务安全校验", () => {
  const VALID_RULE = runRules({
    amountRange: { min: 30000, max: 30000 },
    expectedUseHorizon: "1_to_3y",
    emergencyFundMonths: 4.5,
    highInterestDebt: false,
    lossTolerance: "small",
  });
  const base = {
    conclusion: "结论",
    summary: "摘要",
    buckets: [
      { key: "reserve" as const, label: "a", percentage: 40, action: "x" },
      { key: "stable" as const, label: "b", percentage: 40, action: "y" },
      { key: "learning" as const, label: "c", percentage: 20, action: "z" },
    ],
    nextActions: [{ title: "t", timeframe: "本周" }],
    risks: [],
    sourceIds: ["source-emergency-fund"],
    disclaimer: "d",
  };

  it("桶合计非 100 被拒绝", () => {
    const bad = { ...base, buckets: base.buckets.map((b, i) => (i === 0 ? { ...b, percentage: 50 } : b)) };
    expect(() => validatePlanSafety(bad, VALID_RULE)).toThrow(UnsafeOutputError);
  });

  it("比例超出规则区间被拒绝", () => {
    const bad = { ...base, buckets: base.buckets.map((b, i) => (i === 2 ? { ...b, percentage: 60 } : b)) };
    expect(() => validatePlanSafety(bad, VALID_RULE)).toThrow(UnsafeOutputError);
  });

  it("包含证券代码被拒绝", () => {
    const bad = { ...base, summary: "建议关注 600519 的走势" };
    expect(() => validatePlanSafety(bad, VALID_RULE)).toThrow(UnsafeOutputError);
  });

  it("包含收益承诺被拒绝", () => {
    const bad = { ...base, conclusion: "保证年化 8% 收益" };
    expect(() => validatePlanSafety(bad, VALID_RULE)).toThrow(UnsafeOutputError);
  });

  it("sourceId 白名单：未知来源被清洗，保留已知来源", () => {
    const cleaned = sanitizeSourceIds(["source-emergency-fund", "rule-engine-001", "made-up"]);
    expect(cleaned).toEqual(["source-emergency-fund"]);
  });

  it("sourceId 全部无效时回退默认来源", () => {
    const cleaned = sanitizeSourceIds(["rule-engine-001"]);
    expect(cleaned.length).toBe(3);
    expect(cleaned[0]).toBe("source-emergency-fund");
  });

  it("合法输出通过校验", () => {
    expect(() => validatePlanSafety(base, VALID_RULE)).not.toThrow();
  });
});
