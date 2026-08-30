import { NextResponse } from "next/server";
import { AuthRequiredError, getRepository } from "@/lib/server/repository";
import { AssetInputSchema } from "@/lib/server/schemas";

/**
 * GET /api/assets — 查询资产/负债列表
 * POST /api/assets — 新增资产/负债/目标（P09 保存）
 */
export async function GET() {
  try {
    const { repo, userId, mode } = await getRepository();
    const assets = await repo.listAssets(userId);
    return NextResponse.json({ assets, mode });
  } catch (e) {
    if (e instanceof AuthRequiredError) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("[api/assets] 查询失败:", e);
    return NextResponse.json({ error: "资产查询失败" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const parsed = AssetInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "输入校验失败", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const { repo, userId, mode } = await getRepository();
    const asset = await repo.createAsset(userId, parsed.data);
    return NextResponse.json({ asset, mode }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthRequiredError) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("[api/assets] 创建失败:", e);
    return NextResponse.json({ error: "资产创建失败" }, { status: 500 });
  }
}
