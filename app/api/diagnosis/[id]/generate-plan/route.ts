import { NextResponse } from "next/server";
import { AuthRequiredError, getRepository } from "@/lib/server/repository";
import {
  consumeDailyModelQuota,
  ModelQuotaExceededError,
} from "@/lib/server/ai/daily-quota";
import {
  AIOutputError,
  generatePlan,
  nextQuestionKey,
  UnsafeOutputError,
} from "@/lib/server/diagnosis-service";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/diagnosis/:id/generate-plan
 * 规则引擎先行 → 模型生成解释 → 业务校验（100%/区间/无证券代码/无收益承诺/来源有效）→ 保存计划
 */
export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const { repo, userId, mode } = await getRepository();
    const session = await repo.getDiagnosisSession(userId, id);
    if (!session) {
      return NextResponse.json({ error: "会话不存在或无权访问" }, { status: 404 });
    }
    if (nextQuestionKey(session) !== null) {
      return NextResponse.json(
        { error: "请先完成或跳过全部澄清问题后再生成计划" },
        { status: 409 },
      );
    }
    await consumeDailyModelQuota(userId, "text", 12);
    const plan = await generatePlan(repo, userId, session);
    return NextResponse.json({ plan, mode }, { status: 201 });
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
    if (e instanceof UnsafeOutputError) {
      console.error("[api/generate-plan] 安全校验失败:", e.message);
      return NextResponse.json(
        { error: "生成结果未通过安全校验，已拒绝。请稍后重试。", detail: e.message },
        { status: 422 },
      );
    }
    if (e instanceof AIOutputError) {
      console.error("[api/generate-plan] AI 输出校验失败:", e.message);
      return NextResponse.json(
        { error: "AI 输出未通过结构校验，请重试。" },
        { status: 502 },
      );
    }
    console.error("[api/generate-plan] 失败:", e);
    return NextResponse.json({ error: "计划生成失败，请稍后重试" }, { status: 500 });
  }
}
