import { NextResponse } from "next/server";
import { AuthRequiredError, getRepository } from "@/lib/server/repository";
import { UpdateTaskStatusSchema } from "@/lib/server/schemas";

type Params = { params: Promise<{ id: string }> };

/** GET /api/tasks/:id — 任务详情（含步骤） */
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const { repo, userId, mode } = await getRepository();
    const task = await repo.getTask(userId, id);
    if (!task) {
      return NextResponse.json({ error: "任务不存在或无权访问" }, { status: 404 });
    }
    return NextResponse.json({ task, mode });
  } catch (e) {
    if (e instanceof AuthRequiredError) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("[api/tasks] 查询失败:", e);
    return NextResponse.json({ error: "任务查询失败" }, { status: 500 });
  }
}

/** PATCH /api/tasks/:id — 更新任务状态 */
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const parsed = UpdateTaskStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "输入校验失败" }, { status: 400 });
  }
  try {
    const { repo, userId, mode } = await getRepository();
    const task = await repo.updateTaskStatus(userId, id, parsed.data.status);
    if (!task) {
      return NextResponse.json({ error: "任务不存在或无权访问" }, { status: 404 });
    }
    return NextResponse.json({ task, mode });
  } catch (e) {
    if (e instanceof AuthRequiredError) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("[api/tasks] 更新失败:", e);
    return NextResponse.json({ error: "任务更新失败" }, { status: 500 });
  }
}
