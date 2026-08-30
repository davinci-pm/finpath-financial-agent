import { BUILTIN_SOURCES } from "./ai/mock";
import { PLAN_EXPLANATION_PROMPT, SCENARIO_PROMPT } from "./ai/prompts";
import { createTextProvider } from "./ai/provider";
import { ActionPlanSchema, ScenarioSchema, type ActionPlanOutput, type ScenarioOutput } from "./ai/schemas";
import type { ModelCallRecord, ModelProvider } from "./ai/types";
import { buildDiagnosisInput, runRules, type RuleResult } from "./rules/engine";
import { CLARIFICATION_ORDER, getClarificationQuestion } from "./rules/questions";
import type { DiagnosisRecord, PlanRecord } from "@/lib/types";
import type { FinPathRepository } from "./repository";

/**
 * AI 诊断服务（阶段 4 编排）：
 * 场景识别(AI) → 确定性澄清（一次一问） → 规则引擎(硬约束) → 模型解释(仅文案) → 业务校验 → 保存计划。
 */

/** AI 结构化输出错误：模型输出校验失败且重试一次后仍失败 */
export class AIOutputError extends Error {
  constructor(message: string) {
    super(`AI_OUTPUT_INVALID: ${message}`);
    this.name = "AIOutputError";
  }
}

export class UnsafeOutputError extends Error {
  constructor(message: string) {
    super(`UNSAFE_OUTPUT: ${message}`);
    this.name = "UnsafeOutputError";
  }
}

/** 调用模型并解析 JSON，失败只重试一次（手册 §4.3 / 执行提示词 §5） */
export async function aiJson<T>(
  provider: ModelProvider,
  messages: Array<{ role: "system" | "user"; content: string }>,
  schema: { parse: (v: unknown) => T },
  promptVersion: string,
): Promise<{ data: T; record: ModelCallRecord }> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const started = Date.now();
    let latencyMs = 0;
    try {
      const raw = await provider.complete(messages, { jsonMode: true });
      latencyMs = Date.now() - started;
      const parsed = schema.parse(JSON.parse(raw));
      return {
        data: parsed,
        record: {
          provider: provider.name,
          model: provider.model,
          promptVersion,
          latencyMs,
          schemaValid: true,
          attempt,
        },
      };
    } catch (e) {
      latencyMs = Date.now() - started;
      lastError = e;
      if (attempt === 1) {
        console.warn(`[ai] ${promptVersion} 首次失败，重试一次: ${(e as Error).message}`);
      }
    }
  }
  throw new AIOutputError((lastError as Error)?.message ?? "模型输出解析失败");
}

/* ============ 场景识别 ============ */

export async function recognizeScenario(
  question: string,
): Promise<{ scenario: ScenarioOutput; record: ModelCallRecord }> {
  const provider = createTextProvider();
  const { data, record } = await aiJson<ScenarioOutput>(
    provider,
    [
      { role: "system", content: SCENARIO_PROMPT },
      { role: "user", content: `用户问题：${question}` },
    ],
    ScenarioSchema,
    "scenario-v1",
  );
  return { scenario: data, record };
}

/* ============ 澄清：下一个缺失字段（确定性，一次一问） ============ */

export function nextQuestionKey(session: DiagnosisRecord): string | null {
  for (const key of CLARIFICATION_ORDER) {
    // 任何值（含 "skipped"）都视为已处理，避免重复追问
    const answered = session.answers[key] !== undefined;
    if (!answered && getClarificationQuestion(key)) return key;
  }
  return null;
}

export function nextClarification(session: DiagnosisRecord) {
  const key = nextQuestionKey(session);
  return key ? getClarificationQuestion(key) : null;
}

/* ============ 计划生成：规则先行，模型解释 ============ */

/** A 股常见代码前缀（60/00/30/68/002 开头 + 6 位） */
const SECURITY_CODE_PATTERN =
  /(?:^|[^\d])(?:60\d{4}|00\d{4}|30\d{4}|68\d{4})(?:[^\d]|$)/;
const YIELD_PROMISE_PATTERN =
  /(?:保证收益|保本保息|稳赚|必赚|躺赚|无风险收益|年化\s*\d+(?:\.\d+)?%|预期收益\s*\d+)/;

export function validatePlanSafety(output: ActionPlanOutput, rule: RuleResult) {
  const total = output.buckets.reduce((s, b) => s + b.percentage, 0);
  if (total !== 100) {
    throw new UnsafeOutputError(`资金桶合计必须为 100%，实际 ${total}%`);
  }
  for (const bucket of output.buckets) {
    const range = rule.buckets.find((b) => b.key === bucket.key)?.percentageRange;
    if (range && (bucket.percentage < range[0] || bucket.percentage > range[1])) {
      throw new UnsafeOutputError(
        `${bucket.key} 比例 ${bucket.percentage}% 超出规则区间 ${range[0]}%-${range[1]}%`,
      );
    }
  }
  const allText = [
    output.conclusion,
    output.summary,
    ...output.buckets.map((b) => `${b.label}${b.action}`),
    ...output.nextActions.map((a) => a.title),
    ...output.risks,
  ].join(" ");
  if (SECURITY_CODE_PATTERN.test(allText)) {
    throw new UnsafeOutputError("输出包含疑似证券代码，已拒绝");
  }
  if (YIELD_PROMISE_PATTERN.test(allText)) {
    throw new UnsafeOutputError("输出包含收益承诺表述，已拒绝");
  }
}

/**
 * sourceId 白名单清洗：保留内置来源；无有效来源时回退规则默认来源。
 */
export function sanitizeSourceIds(sourceIds: string[]): string[] {
  const knownIds = new Set(BUILTIN_SOURCES.map((s) => s.id));
  const filtered = sourceIds.filter((id) => knownIds.has(id));
  return filtered.length > 0
    ? filtered
    : ["source-emergency-fund", "source-treasury-bonds", "source-fund-basics"];
}

export async function generatePlan(
  repo: FinPathRepository,
  userId: string,
  session: DiagnosisRecord,
): Promise<PlanRecord> {
  // 1. 金额区间：从 answers 无则用宽区间（场景识别时的 knownFacts 未持久化，MVP 用默认）
  const amountMin = session.answers.amountMin ? Number(session.answers.amountMin) : 10000;
  const amountMax = session.answers.amountMax ? Number(session.answers.amountMax) : 500000;
  const input = buildDiagnosisInput({ min: amountMin, max: amountMax }, session.answers);

  // 2. 规则引擎先行（确定性硬约束与桶区间）
  const rule = runRules(input);
  const rationale = rule.buckets.flatMap((b) =>
    b.rationaleCodes.map((code) => ruleText(code)),
  );

  // 3. 模型只负责解释与组织（输入规则结果）
  const provider = createTextProvider();
  const { data: output, record } = await aiJson<ActionPlanOutput>(
    provider,
    [
      { role: "system", content: PLAN_EXPLANATION_PROMPT },
      {
        role: "user",
        content: `规则结果 JSON：\n${JSON.stringify({
          hardConstraints: rule.hardConstraints,
          liquidityPriority: rule.liquidityPriority,
          debtPriority: rule.debtPriority,
          buckets: rule.buckets.map((b) => ({ key: b.key, percentageRange: b.percentageRange })),
        })}\n\n请生成用户可读的行动路径。`,
      },
    ],
    ActionPlanSchema,
    "plan-explanation-v1",
  );

  // 4. 业务规则校验（100%、区间、无证券代码、无收益承诺）
  validatePlanSafety(output, rule);

  // 5. sourceId 白名单过滤：仅保留内置来源；模型未返回有效来源时回退规则默认来源
  const sourceIds = sanitizeSourceIds(output.sourceIds);

  // 6. 保存计划
  const plan = await repo.createPlan(userId, {
    sessionId: session.id,
    conclusion: output.conclusion,
    summary: output.summary,
    hardConstraints: rule.hardConstraints,
    buckets: output.buckets.map((b) => ({
      key: b.key,
      label: b.label,
      percentage: b.percentage,
      tag: b.key === "reserve" ? "优先确认" : b.key === "stable" ? "适合中长期" : "小额学习",
      tagline:
        b.key === "reserve"
          ? "流动性与应急用途"
          : b.key === "stable"
            ? "了解存款、国债等类别的期限和风险"
            : "通过模拟或可承受的小额资金理解波动",
      suitableFor:
        b.key === "reserve"
          ? "覆盖应急与近期可能需要动用的资金。"
          : b.key === "stable"
            ? "期限内用得上、又不想承受大波动的资金。"
            : "愿意承担波动、用于学习投资体验的资金。",
      watchOut:
        b.key === "reserve"
          ? "不要投入有锁定期的产品。"
          : b.key === "stable"
            ? "注意起购金额与提前支取规则。"
            : "亏损可能影响本金，需控制比例。",
      nextStep: b.action,
    })),
    actionItems: output.nextActions.map((a, i) => ({
      id: `ai-${i + 1}`,
      title: a.title,
      done: false,
    })),
    risks: output.risks,
    sourceIds,
    disclaimer: output.disclaimer,
    rationale,
  });

  void record;
  return plan;
}

function ruleText(code: string): string {
  const map: Record<string, string> = {
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
  return map[code] ?? code;
}
