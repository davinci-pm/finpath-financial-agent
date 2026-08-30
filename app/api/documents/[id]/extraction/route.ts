import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthRequiredError, getRepository } from "@/lib/server/repository";

type Params = { params: Promise<{ id: string }> };

const ConfirmSchema = z.object({
  confirmed: z.record(z.string(), z.string()),
});

/**
 * PATCH /api/documents/:id/extraction — 保存用户确认字段
 * 用户确认前不得生成最终解读。
 */
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const parsed = ConfirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "输入校验失败" }, { status: 400 });
  }

  try {
    const { repo, userId, mode } = await getRepository();
    const doc = await repo.getDocument(userId, id);
    if (!doc) {
      return NextResponse.json({ error: "文档不存在或无权访问" }, { status: 404 });
    }
    const extraction = await repo.confirmExtraction(userId, id, parsed.data.confirmed);
    return NextResponse.json({ extraction, mode });
  } catch (e) {
    if (e instanceof AuthRequiredError) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("[api/documents/extraction] 失败:", e);
    return NextResponse.json({ error: "字段确认保存失败" }, { status: 500 });
  }
}
