import type { ModelMessage, ModelProvider } from "./types";

/**
 * MockModelProvider：测试/无 Key 环境使用，不消耗真实 Token。
 * 根据 promptVersion 返回固定但符合 Zod Schema 的 JSON。
 */
export class MockModelProvider implements ModelProvider {
  readonly name = "mock";
  readonly model = "mock-model";

  async complete(messages: ModelMessage[]): Promise<string> {
    const system = messages.find((m) => m.role === "system")?.content ?? "";

    if (system.includes("识别用户问题属于哪个场景")) {
      return JSON.stringify({
        scenario: "money_plan",
        confidence: 0.9,
        knownFacts: { amountRange: { min: 30000, max: 30000 }, hasDebt: false },
        missingCriticalFields: ["expectedUseHorizon", "emergencyFundMonths", "lossTolerance"],
        safetyFlags: [],
      });
    }

    if (system.includes("规则引擎给出的硬约束")) {
      const user = messages.find((m) => m.role === "user")?.content ?? "";
      const start = user.indexOf("{");
      const end = user.lastIndexOf("}");
      const rule = start >= 0 && end > start
        ? JSON.parse(user.slice(start, end + 1)) as {
            buckets?: Array<{ key: string; percentageRange: [number, number] }>;
          }
        : {};
      const ranges = rule.buckets ?? [
        { key: "reserve", percentageRange: [35, 45] as [number, number] },
        { key: "stable", percentageRange: [30, 45] as [number, number] },
        { key: "learning", percentageRange: [15, 25] as [number, number] },
      ];
      const percentages = ranges.map((bucket) => bucket.percentageRange[0]);
      let remaining = 100 - percentages.reduce((sum, value) => sum + value, 0);
      for (let i = 0; i < ranges.length && remaining > 0; i++) {
        const capacity = ranges[i].percentageRange[1] - percentages[i];
        const addition = Math.min(capacity, remaining);
        percentages[i] += addition;
        remaining -= addition;
      }
      return JSON.stringify({
        conclusion: "这笔钱暂时不适合全部进入高波动资产",
        summary: "根据 1～3 年资金期限和当前应急储备情况，建议先拆分资金用途。",
        buckets: [
          { key: "reserve", label: "生活缓冲区", percentage: percentages[0], action: "确认应急资金目标" },
          { key: "stable", label: "稳健了解区", percentage: percentages[1], action: "了解国债的购买与期限" },
          { key: "learning", label: "小额学习区", percentage: percentages[2], action: "完成基金波动入门卡" },
        ],
        nextActions: [
          { title: "确认应急资金目标", timeframe: "本周" },
          { title: "了解国债的购买与期限", timeframe: "本周" },
          { title: "完成基金波动入门卡", timeframe: "两周内" },
        ],
        risks: ["市场波动可能导致本金变化", "提前支取可能产生费用"],
        sourceIds: ["source-emergency-fund", "source-treasury-bonds", "source-fund-basics"],
        disclaimer: "行动教育建议，不构成具体投资推荐。",
      });
    }

    // 兜底：返回简单对象（应避免走到这里）
    return JSON.stringify({ ok: true });
  }
}

/** 固定可信来源库（规则引擎 sourceIds 引用） */
export const BUILTIN_SOURCES: Array<{
  id: string;
  title: string;
  type: "official" | "platform";
  updatedAt: string;
}> = [
  { id: "source-emergency-fund", title: "应急储备与流动性说明（示例）", type: "official", updatedAt: "2026-07-01" },
  { id: "source-treasury-bonds", title: "国债发行安排（示例）", type: "official", updatedAt: "2026-08-01" },
  { id: "source-fund-basics", title: "平台解释：基金波动入门", type: "platform", updatedAt: "2026-08-10" },
  { id: "source-debt-priority", title: "高息负债偿还优先级（示例）", type: "official", updatedAt: "2026-06-15" },
];
