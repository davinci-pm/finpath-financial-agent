import { NextResponse } from "next/server";
import { AuthRequiredError, getRepository } from "@/lib/server/repository";
import { generateReport } from "@/lib/server/documents/report";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/documents/:id/generate-report — 生成产品解读（仅用户确认字段后）
 * 解读为确定性模板（无模型调用），来源标注区分文件原文/AI 推断/未知。
 */
export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const { repo, userId, mode } = await getRepository();
    const doc = await repo.getDocument(userId, id);
    if (!doc) {
      return NextResponse.json({ error: "文档不存在或无权访问" }, { status: 404 });
    }
    const extraction = await repo.getExtraction(userId, id);
    if (!extraction || extraction.status !== "confirmed") {
      return NextResponse.json(
        { error: "请先确认提取字段后再生成解读" },
        { status: 409 },
      );
    }
    const report = generateReport(
      id,
      extraction.confirmedFields,
      extraction.fields,
    );
    return NextResponse.json({ report, mode });
  } catch (e) {
    if (e instanceof AuthRequiredError) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("[api/documents/generate-report] 失败:", e);
    return NextResponse.json({ error: "解读生成失败" }, { status: 500 });
  }
}
