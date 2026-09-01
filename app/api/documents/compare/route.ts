import { NextResponse } from "next/server";
import { DOCUMENT_FIELD_KEYS, AuthRequiredError, getRepository } from "@/lib/server/repository";

const FIELD_LABELS: Record<(typeof DOCUMENT_FIELD_KEYS)[number], string> = {
  name: "产品名称",
  type: "产品类型",
  term: "期限",
  yield: "收益表达",
  risk: "风险等级",
  guaranteed: "是否保本",
  early_exit: "提前退出",
  fees: "费用",
  min_purchase: "起购金额",
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { leftId?: string; rightId?: string };
    if (!body.leftId || !body.rightId || body.leftId === body.rightId) {
      return NextResponse.json({ error: "请选择两份不同的文档" }, { status: 400 });
    }
    const { repo, userId } = await getRepository();
    const [leftDoc, rightDoc, leftExtraction, rightExtraction] = await Promise.all([
      repo.getDocument(userId, body.leftId),
      repo.getDocument(userId, body.rightId),
      repo.getExtraction(userId, body.leftId),
      repo.getExtraction(userId, body.rightId),
    ]);
    if (!leftDoc || !rightDoc || !leftExtraction || !rightExtraction) {
      return NextResponse.json({ error: "文档不存在或尚未完成识别" }, { status: 404 });
    }
    const valueOf = (extraction: typeof leftExtraction, key: string) =>
      extraction.confirmedFields[key] ||
      extraction.fields.find((field) => field.key === key)?.value ||
      "未识别";
    const rows = DOCUMENT_FIELD_KEYS.map((key) => ({
      key,
      label: FIELD_LABELS[key],
      left: valueOf(leftExtraction, key),
      right: valueOf(rightExtraction, key),
      different: valueOf(leftExtraction, key) !== valueOf(rightExtraction, key),
    }));
    return NextResponse.json({
      left: { id: leftDoc.id, fileName: leftDoc.fileName },
      right: { id: rightDoc.id, fileName: rightDoc.fileName },
      rows,
      warnings: [
        "收益表达不等于承诺收益，请以合同原文为准。",
        "比较结果用于信息整理，不构成购买建议。",
      ],
    });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("[api/documents/compare] 失败:", error);
    return NextResponse.json({ error: "文档比较失败" }, { status: 500 });
  }
}
