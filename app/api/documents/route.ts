import { NextResponse } from "next/server";
import { AuthRequiredError, getRepository } from "@/lib/server/repository";
import { isAcceptedFile, maxUploadBytes } from "@/lib/server/documents/analyzer";

/**
 * POST /api/documents — 上传金融产品文件（multipart/form-data, 字段名 file）
 * 仅允许 PDF/PNG/JPG，默认 ≤20MB；私有 Storage（Supabase 模式）或内存（Demo 模式）。
 */
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 multipart" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "缺少文件字段 file" }, { status: 400 });
  }

  const mimeType = file.type || "application/octet-stream";
  if (!isAcceptedFile(file.name, mimeType)) {
    return NextResponse.json(
      { error: "仅支持 PDF、PNG、JPG 文件" },
      { status: 415 },
    );
  }
  const maxBytes = maxUploadBytes();
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `文件超过 ${Math.round(maxBytes / 1024 / 1024)}MB 限制` },
      { status: 413 },
    );
  }

  try {
    const { repo, userId, mode } = await getRepository();
    const buffer = Buffer.from(await file.arrayBuffer());
    const doc = await repo.createDocument(userId, {
      fileName: file.name,
      mimeType,
      sizeBytes: file.size,
      buffer,
    });
    return NextResponse.json({ document: doc, mode }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthRequiredError) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("[api/documents] 上传失败:", e);
    return NextResponse.json({ error: "文件上传失败" }, { status: 500 });
  }
}
