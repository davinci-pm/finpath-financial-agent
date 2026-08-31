import { NextResponse } from "next/server";
import { AuthRequiredError, getRepository } from "@/lib/server/repository";
import { createDocumentAnalyzer } from "@/lib/server/documents";
import {
  consumeDailyModelQuota,
  ModelQuotaExceededError,
} from "@/lib/server/ai/daily-quota";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/documents/:id/analyze — 调用 DocumentAnalyzer 提取字段
 * 字段包含：来源类型（file/ai/unknown）、置信度、页码、原文片段。
 */
export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const { repo, userId, mode } = await getRepository();
    const doc = await repo.getDocument(userId, id);
    if (!doc) {
      return NextResponse.json({ error: "文档不存在或无权访问" }, { status: 404 });
    }
    const buffer = await repo.getDocumentBuffer(userId, id);
    if (!buffer) {
      return NextResponse.json({ error: "文档内容不可用" }, { status: 410 });
    }

    await consumeDailyModelQuota(userId, "document", 3);
    await repo.updateDocumentStatus(userId, id, "analyzing");
    const analyzer = createDocumentAnalyzer();
    let fields;
    try {
      fields = await analyzer.analyze({
        buffer,
        fileName: doc.fileName,
        mimeType: doc.mimeType,
      });
    } catch (e) {
      await repo.updateDocumentStatus(userId, id, "failed");
      console.error("[api/documents/analyze] 解析失败:", e);
      return NextResponse.json(
        { error: "文件解析失败，请重试或更换文件" },
        { status: 502 },
      );
    }

    const extraction = await repo.saveExtraction(userId, id, fields);
    return NextResponse.json({ extraction, analyzer: analyzer.name, mode });
  } catch (e) {
    if (e instanceof AuthRequiredError) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    if (e instanceof ModelQuotaExceededError) {
      return NextResponse.json(
        { error: "今日文档识别次数已达内测上限，请明天再试" },
        { status: 429 },
      );
    }
    console.error("[api/documents/analyze] 失败:", e);
    return NextResponse.json({ error: "分析失败" }, { status: 500 });
  }
}
