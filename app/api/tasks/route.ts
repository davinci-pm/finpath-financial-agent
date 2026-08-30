import { NextResponse } from "next/server";
import { AuthRequiredError, getRepository } from "@/lib/server/repository";
import { CreateTaskSchema } from "@/lib/server/schemas";

/**
 * GET /api/tasks — 任务列表（含步骤）
 * POST /api/tasks — 创建任务（P03 保存行动路径 / P05 保存解读 / 手动新建）
 */
export async function GET() {
  try {
    const { repo, userId, mode } = await getRepository();
    const tasks = await repo.listTasks(userId);
    return NextResponse.json({ tasks, mode });
  } catch (e) {
    if (e instanceof AuthRequiredError) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("[api/tasks] 查询失败:", e);
    return NextResponse.json({ error: "任务查询失败" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const parsed = CreateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "输入校验失败", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const { repo, userId, mode } = await getRepository();
    const task = await repo.createTask(userId, parsed.data);
    return NextResponse.json({ task, mode }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthRequiredError) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("[api/tasks] 创建失败:", e);
    return NextResponse.json({ error: "任务创建失败" }, { status: 500 });
  }
}
