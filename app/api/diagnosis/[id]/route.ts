import { NextResponse } from "next/server";
import { AuthRequiredError, getRepository } from "@/lib/server/repository";
import { nextClarification } from "@/lib/server/diagnosis-service";

type Params = { params: Promise<{ id: string }> };

/** GET /api/diagnosis/:id — 获取会话与当前澄清问题 */
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const { repo, userId, mode } = await getRepository();
    const session = await repo.getDiagnosisSession(userId, id);
    if (!session) {
      return NextResponse.json({ error: "会话不存在或无权访问" }, { status: 404 });
    }
    return NextResponse.json({
      session,
      question: nextClarification(session),
      mode,
    });
  } catch (e) {
    if (e instanceof AuthRequiredError) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("[api/diagnosis] 查询失败:", e);
    return NextResponse.json({ error: "会话查询失败" }, { status: 500 });
  }
}
