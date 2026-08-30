import { NextResponse } from "next/server";
import { AuthRequiredError, getRepository } from "@/lib/server/repository";

type Params = { params: Promise<{ id: string }> };

/** GET /api/documents/:id — 文档 + 提取/确认字段 */
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const { repo, userId, mode } = await getRepository();
    const doc = await repo.getDocument(userId, id);
    if (!doc) {
      return NextResponse.json({ error: "文档不存在或无权访问" }, { status: 404 });
    }
    const extraction = await repo.getExtraction(userId, id);
    return NextResponse.json({ document: doc, extraction, mode });
  } catch (e) {
    if (e instanceof AuthRequiredError) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("[api/documents] 查询失败:", e);
    return NextResponse.json({ error: "文档查询失败" }, { status: 500 });
  }
}
