import { describe, expect, it } from "vitest";
import { parseTransactionsCsv, transactionsToCsv } from "@/lib/finance/csv";
import { calculateFinancialHealth, simulateScenario, summarizeCashflow } from "@/lib/finance/workspace";
import type { MoneyMap, Transaction } from "@/lib/types";

const transactions: Transaction[] = [
  { id: "1", type: "income", amount: 12000, category: "工资", description: "八月工资", date: "2026-08-05", source: "manual", createdAt: "2026-08-05T00:00:00Z" },
  { id: "2", type: "expense", amount: 4000, category: "住房", description: "房租", date: "2026-08-06", source: "manual", createdAt: "2026-08-06T00:00:00Z" },
  { id: "3", type: "expense", amount: 2000, category: "日常生活", description: "生活费", date: "2026-08-07", source: "csv", createdAt: "2026-08-07T00:00:00Z" },
];

describe("现金流与财务体检", () => {
  it("汇总月度收支和分类", () => {
    const result = summarizeCashflow(transactions, "2026-08");
    expect(result).toMatchObject({ income: 12000, expense: 6000, balance: 6000, savingsRate: 50 });
    expect(result.byCategory[0]).toMatchObject({ category: "住房", amount: 4000 });
  });

  it("根据可解释指标生成体检与下一步", () => {
    const map: MoneyMap = {
      totalAssets: 200000, totalLiabilities: 40000, netAssets: 160000,
      emergencyCoverageMonths: 4, assets: [], liabilities: [], goals: [], updatedAt: "2026-08-31",
    };
    const health = calculateFinancialHealth(map, summarizeCashflow(transactions, "2026-08"));
    expect(health.score).toBeGreaterThan(50);
    expect(health.metrics).toHaveLength(4);
    expect(health.nextAction.href).toMatch(/^\//);
  });

  it("推演一次性支出后的现金轨迹", () => {
    const result = simulateScenario({ initialCash: 50000, monthlyIncome: 10000, monthlyExpense: 12000, oneTimeExpense: 20000, months: 12 });
    expect(result.monthlyBalance).toBe(-2000);
    expect(result.endingCash).toBe(6000);
    expect(result.points).toHaveLength(13);
  });
});

describe("CSV 导入导出", () => {
  it("支持中英文表头与负数支出", () => {
    const rows = parseTransactionsCsv("日期,类型,金额,分类,说明\n2026-08-01,支出,-88,餐饮,午餐\n2026-08-02,income,1000,工资,兼职");
    expect(rows).toEqual([
      { date: "2026-08-01", type: "expense", amount: 88, category: "餐饮", description: "午餐", source: "csv" },
      { date: "2026-08-02", type: "income", amount: 1000, category: "工资", description: "兼职", source: "csv" },
    ]);
  });

  it("导出时中和电子表格公式注入", () => {
    const csv = transactionsToCsv([{ ...transactions[0], description: "=HYPERLINK(\"bad\")" }]);
    expect(csv).toContain("'=HYPERLINK");
  });

  it("拒绝缺少必要列的文件", () => {
    expect(() => parseTransactionsCsv("类型,说明\n支出,午餐")).toThrow("日期/date");
  });
});
