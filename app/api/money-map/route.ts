import { NextResponse } from "next/server";
import { AuthRequiredError, getRepository } from "@/lib/server/repository";

/**
 * GET /api/money-map — 资金地图聚合（总资产/负债/净资产/应急覆盖 + 明细）
 */
export async function GET() {
  try {
    const { repo, userId, mode } = await getRepository();
    const map = await repo.getMoneyMap(userId);
    return NextResponse.json({ ...map, mode });
  } catch (e) {
    if (e instanceof AuthRequiredError) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("[api/money-map] 失败:", e);
    return NextResponse.json({ error: "资金地图加载失败" }, { status: 500 });
  }
}
