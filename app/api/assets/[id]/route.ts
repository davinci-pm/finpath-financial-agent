import { NextResponse } from "next/server";
import { AuthRequiredError, getRepository } from "@/lib/server/repository";
import { AssetUpdateSchema } from "@/lib/server/schemas";

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/assets/:id — 更新资产（校验所有权） */
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const parsed = AssetUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "输入校验失败", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const { repo, userId, mode } = await getRepository();
    const asset = await repo.updateAsset(userId, id, parsed.data);
    if (!asset) {
      return NextResponse.json({ error: "资产不存在或无权访问" }, { status: 404 });
    }
    return NextResponse.json({ asset, mode });
  } catch (e) {
    if (e instanceof AuthRequiredError) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("[api/assets] 更新失败:", e);
    return NextResponse.json({ error: "资产更新失败" }, { status: 500 });
  }
}

/** DELETE /api/assets/:id — 删除资产（校验所有权） */
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const { repo, userId } = await getRepository();
    const deleted = await repo.deleteAsset(userId, id);
    if (!deleted) {
      return NextResponse.json({ error: "资产不存在或无权访问" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthRequiredError) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("[api/assets] 删除失败:", e);
    return NextResponse.json({ error: "资产删除失败" }, { status: 500 });
  }
}
