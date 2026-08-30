import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthRequiredError, getRepository } from "@/lib/server/repository";
import { nextClarification } from "@/lib/server/diagnosis-service";
import { getClarificationQuestion } from "@/lib/server/rules/questions";

type Params = { params: Promise<{ id: string }> };

const AnswerSchema = z.object({
  key: z.string(),
  value: z.string().min(1).max(40),
});

/**
 * POST /api/diagnosis/:id/answer — 提交答案
 * 校验问题 key 合法 → 保存 → 返回下一问或完成状态
 */
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const parsed = AnswerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "输入校验失败" }, { status: 400 });
  }

  try {
    const { repo, userId, mode } = await getRepository();
    const session = await repo.getDiagnosisSession(userId, id);
    if (!session) {
      return NextResponse.json({ error: "会话不存在或无权访问" }, { status: 404 });
    }
    const question = getClarificationQuestion(parsed.data.key);
    if (!question) {
      return NextResponse.json({ error: `未知澄清字段: ${parsed.data.key}` }, { status: 400 });
    }
    const valueAllowed =
      question.options.some((option) => option.value === parsed.data.value) ||
      (question.skippable && parsed.data.value === "skipped");
    if (!valueAllowed) {
      return NextResponse.json({ error: "答案不属于该问题的可选项" }, { status: 400 });
    }
    const currentKey = nextClarification(session)?.key;
    const isEditingAnsweredField = session.answers[parsed.data.key] !== undefined;
    if (currentKey !== parsed.data.key && !isEditingAnsweredField) {
      return NextResponse.json({ error: "请先回答当前问题" }, { status: 409 });
    }

    const answers = { ...session.answers, [parsed.data.key]: parsed.data.value };
    const updated = await repo.updateDiagnosisSession(userId, id, { answers });

    const next = nextClarification({ ...session, answers });
    if (next) {
      await repo.updateDiagnosisSession(userId, id, { currentQuestionKey: next.key });
      return NextResponse.json({ session: updated, question: next, completed: false, mode });
    }

    const completedSession = await repo.updateDiagnosisSession(userId, id, {
      status: "completed",
      currentQuestionKey: null,
    });
    return NextResponse.json({ session: completedSession, question: null, completed: true, mode });
  } catch (e) {
    if (e instanceof AuthRequiredError) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("[api/diagnosis/answer] 失败:", e);
    return NextResponse.json({ error: "答案提交失败" }, { status: 500 });
  }
}
