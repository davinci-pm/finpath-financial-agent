import { NextResponse } from "next/server";
import { calculateFinancialHealth, summarizeCashflow } from "@/lib/finance/workspace";
import { AuthRequiredError, getRepository } from "@/lib/server/repository";

export async function GET(request: Request) {
  try {
    const fallbackMonth = new Date().toISOString().slice(0, 7);
    const month = new URL(request.url).searchParams.get("month") ?? fallbackMonth;
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "月份格式应为 YYYY-MM" }, { status: 400 });
    }
    const { repo, userId, mode } = await getRepository();
    const [map, transactions] = await Promise.all([
      repo.getMoneyMap(userId),
      repo.listTransactions(userId, month),
    ]);
    const cashflow = summarizeCashflow(transactions, month);
    const health = calculateFinancialHealth(map, cashflow);
    return NextResponse.json({ health, cashflow, mode });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("[api/financial-health] 失败:", error);
    return NextResponse.json({ error: "财务体检计算失败" }, { status: 500 });
  }
}
