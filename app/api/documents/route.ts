import { NextResponse } from "next/server";
import { AuthRequiredError, getRepository } from "@/lib/server/repository";
import {
  hasAcceptedFileSignature,
  isAcceptedFile,
  maxUploadBytes,
} from "@/lib/server/documents/analyzer";

export async function GET() {
  try {
    const { repo, userId, mode } = await getRepository();
    const documents = await repo.listDocuments(userId);
    return NextResponse.json({ documents, mode });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "文档列表加载失败" }, { status: 500 });
  }
}

/**
 * POST /api/documents — 上传金融产品文件（multipart/form-data, 字段名 file）
 * 仅允许 PDF/PNG/JPG，默认 ≤4MB；生产使用 Vercel Private Blob。
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
  if (file.size === 0) {
    return NextResponse.json({ error: "文件内容为空" }, { status: 400 });
  }

  try {
    const { repo, userId, mode } = await getRepository();
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!hasAcceptedFileSignature(buffer, mimeType)) {
      return NextResponse.json(
        { error: "文件内容与扩展名或类型不匹配" },
        { status: 415 },
      );
    }
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
