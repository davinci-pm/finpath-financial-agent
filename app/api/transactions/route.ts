import { NextResponse } from "next/server";
import { AuthRequiredError, getRepository } from "@/lib/server/repository";
import { TransactionBatchSchema, TransactionInputSchema } from "@/lib/server/schemas";

export async function GET(request: Request) {
  try {
    const month = new URL(request.url).searchParams.get("month") ?? undefined;
    if (month && !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "月份格式应为 YYYY-MM" }, { status: 400 });
    }
    const { repo, userId, mode } = await getRepository();
    const transactions = await repo.listTransactions(userId, month);
    return NextResponse.json({ transactions, mode });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("[api/transactions] 查询失败:", error);
    return NextResponse.json({ error: "现金流查询失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const batch = TransactionBatchSchema.safeParse(body);
    const single = batch.success ? null : TransactionInputSchema.safeParse(body);
    if (!batch.success && !single?.success) {
      return NextResponse.json({ error: "现金流输入校验失败" }, { status: 400 });
    }
    const { repo, userId, mode } = await getRepository();
    let transactions;
    if (batch.success) {
      transactions = await repo.createTransactions(userId, batch.data.transactions);
    } else if (single?.success) {
      transactions = [await repo.createTransaction(userId, single.data)];
    } else {
      return NextResponse.json({ error: "现金流输入校验失败" }, { status: 400 });
    }
    return NextResponse.json({ transactions, mode }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("[api/transactions] 创建失败:", error);
    return NextResponse.json({ error: "现金流保存失败" }, { status: 500 });
  }
}
