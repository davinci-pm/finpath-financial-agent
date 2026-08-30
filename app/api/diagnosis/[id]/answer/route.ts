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
    // 校验 key 是合法澄清问题
    if (!getClarificationQuestion(parsed.data.key)) {
      return NextResponse.json({ error: `未知澄清字段: ${parsed.data.key}` }, { status: 400 });
    }

    const answers = { ...session.answers, [parsed.data.key]: parsed.data.value };
    const updated = await repo.updateDiagnosisSession(userId, id, { answers });

    const next = nextClarification({ ...session, answers });
    if (next) {
      await repo.updateDiagnosisSession(userId, id, { currentQuestionKey: next.key });
      return NextResponse.json({ session: updated, question: next, completed: false, mode });
    }

    await repo.updateDiagnosisSession(userId, id, {
      status: "completed",
      currentQuestionKey: null,
    });
    return NextResponse.json({ session: updated, question: null, completed: true, mode });
  } catch (e) {
    if (e instanceof AuthRequiredError) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("[api/diagnosis/answer] 失败:", e);
    return NextResponse.json({ error: "答案提交失败" }, { status: 500 });
  }
}
