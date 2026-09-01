import { transactionsToCsv } from "@/lib/finance/csv";
import { AuthRequiredError, getRepository } from "@/lib/server/repository";

export async function GET(request: Request) {
  try {
    const month = new URL(request.url).searchParams.get("month") ?? undefined;
    const { repo, userId } = await getRepository();
    const csv = transactionsToCsv(await repo.listTransactions(userId, month));
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="finpath-${month ?? "all"}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return Response.json({ error: "请先登录" }, { status: 401 });
    }
    return Response.json({ error: "导出失败" }, { status: 500 });
  }
}
