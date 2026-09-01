import { NextResponse } from "next/server";
import { AuthRequiredError, getRepository } from "@/lib/server/repository";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { repo, userId } = await getRepository();
    const deleted = await repo.deleteTransaction(userId, id);
    return deleted
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: "记录不存在" }, { status: 404 });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
