import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthRequiredError, getRepository } from "@/lib/server/repository";
import { nextClarification, recognizeScenario } from "@/lib/server/diagnosis-service";
import {
  consumeDailyModelQuota,
  ModelQuotaExceededError,
} from "@/lib/server/ai/daily-quota";

const CreateDiagnosisSchema = z.object({
  question: z.string().min(2).max(500),
});

/**
 * POST /api/diagnosis — 创建诊断会话
 * 场景识别（AI + ScenarioSchema）→ 创建会话 → 返回首个澄清问题（一次一问）
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const parsed = CreateDiagnosisSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "输入校验失败", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const { repo, userId, mode } = await getRepository();
    await consumeDailyModelQuota(userId, "text", 12);
    const { scenario } = await recognizeScenario(parsed.data.question);
    if (scenario.safetyFlags.length > 0) {
      return NextResponse.json(
        {
          error: "该问题涉及敏感或越界内容（如交易密码、身份隐瞒、具体买卖指令），已转为风险教育说明。",
          safetyFlags: scenario.safetyFlags,
        },
        { status: 422 },
      );
    }
    const session = await repo.createDiagnosisSession(userId, {
      rawQuestion: parsed.data.question,
      scenarioType: scenario.scenario,
    });
    // 持久化已识别金额事实（供 P02 摘要显示）
    const range = scenario.knownFacts.amountRange as
      | { min?: number; max?: number }
      | undefined;
    const amountAnswers: Record<string, string> = {};
    if (range?.min != null) amountAnswers.amountMin = String(range.min);
    if (range?.max != null) amountAnswers.amountMax = String(range.max);
    if (Object.keys(amountAnswers).length > 0) {
      await repo.updateDiagnosisSession(userId, session.id, {
        answers: amountAnswers,
      });
    }
    const first = nextClarification(session);
    if (first) {
      await repo.updateDiagnosisSession(userId, session.id, {
        currentQuestionKey: first.key,
      });
    }
    return NextResponse.json(
      { session, question: first, scenario: scenario.scenario, mode },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof AuthRequiredError) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    if (e instanceof ModelQuotaExceededError) {
      return NextResponse.json(
        { error: "今日 AI 使用次数已达内测上限，请明天再试" },
        { status: 429 },
      );
    }
    console.error("[api/diagnosis] 创建失败:", e);
    return NextResponse.json(
      { error: "诊断会话创建失败，请稍后重试" },
      { status: 500 },
    );
  }
}
