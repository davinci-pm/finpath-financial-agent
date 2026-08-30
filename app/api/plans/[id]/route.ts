import { NextResponse } from "next/server";
import { AuthRequiredError, getRepository } from "@/lib/server/repository";

type Params = { params: Promise<{ id: string }> };

/** GET /api/plans/:id — 获取行动路径 */
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const { repo, userId, mode } = await getRepository();
    const plan = await repo.getPlan(userId, id);
    if (!plan) {
      return NextResponse.json({ error: "计划不存在或无权访问" }, { status: 404 });
    }
    return NextResponse.json({ plan, mode });
  } catch (e) {
    if (e instanceof AuthRequiredError) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("[api/plans] 查询失败:", e);
    return NextResponse.json({ error: "计划查询失败" }, { status: 500 });
  }
}
