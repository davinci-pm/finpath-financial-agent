import { NextResponse } from "next/server";
import { AuthRequiredError, getRepository } from "@/lib/server/repository";

type Params = { params: Promise<{ id: string; stepId: string }> };

/**
 * PATCH /api/tasks/:id/steps/:stepId — 完成任务步骤
 * 成功后自动推进任务进度；全部完成时任务转为 completed（P10/P11 进度一致）。
 */
export async function PATCH(_req: Request, { params }: Params) {
  const { id, stepId } = await params;
  try {
    const { repo, userId, mode } = await getRepository();
    const task = await repo.completeStep(userId, id, stepId);
    if (!task) {
      return NextResponse.json({ error: "任务或步骤不存在，或无权访问" }, { status: 404 });
    }
    return NextResponse.json({ task, mode });
  } catch (e) {
    if (e instanceof AuthRequiredError) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("[api/tasks/steps] 完成步骤失败:", e);
    return NextResponse.json({ error: "步骤更新失败" }, { status: 500 });
  }
}
