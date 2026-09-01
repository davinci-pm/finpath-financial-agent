import type {
  CashflowSummary,
  FinancialHealth,
  MoneyMap,
  ScenarioInput,
  ScenarioResult,
  Transaction,
} from "@/lib/types";

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, Math.round(value)));

export function summarizeCashflow(
  transactions: Transaction[],
  month: string,
): CashflowSummary {
  const selected = transactions.filter((item) => item.date.startsWith(month));
  const income = selected
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);
  const expenseItems = selected.filter((item) => item.type === "expense");
  const expense = expenseItems.reduce((sum, item) => sum + item.amount, 0);
  const categoryTotals = new Map<string, number>();
  for (const item of expenseItems) {
    categoryTotals.set(item.category, (categoryTotals.get(item.category) ?? 0) + item.amount);
  }
  return {
    month,
    income,
    expense,
    balance: income - expense,
    savingsRate: income > 0 ? Math.round(((income - expense) / income) * 100) : 0,
    byCategory: [...categoryTotals.entries()]
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: expense > 0 ? Math.round((amount / expense) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount),
  };
}

export function calculateFinancialHealth(
  map: MoneyMap,
  cashflow: CashflowSummary,
): FinancialHealth {
  const cashflowScore = cashflow.income === 0
    ? 35
    : clamp(45 + cashflow.savingsRate * 1.8);
  const emergencyScore = clamp((map.emergencyCoverageMonths / 6) * 100);
  const debtRatio = map.totalAssets > 0 ? map.totalLiabilities / map.totalAssets : 1;
  const debtScore = clamp((1 - debtRatio) * 100);
  const dataPoints = map.assets.length + map.liabilities.length + (cashflow.income > 0 ? 2 : 0);
  const dataScore = clamp((dataPoints / 8) * 100);

  const metric = (
    key: FinancialHealth["metrics"][number]["key"],
    label: string,
    score: number,
    explanation: string,
  ): FinancialHealth["metrics"][number] => ({
    key,
    label,
    score,
    status: score >= 70 ? "good" : score >= 45 ? "watch" : "risk",
    explanation,
  });

  const metrics: FinancialHealth["metrics"] = [
    metric(
      "cashflow",
      "收支韧性",
      cashflowScore,
      cashflow.income > 0
        ? `本月结余率 ${cashflow.savingsRate}%`
        : "补充本月收入后可判断结余能力",
    ),
    metric(
      "emergency",
      "应急储备",
      emergencyScore,
      `可覆盖约 ${map.emergencyCoverageMonths} 个月支出，参考目标为 6 个月`,
    ),
    metric(
      "debt",
      "负债压力",
      debtScore,
      map.totalAssets > 0
        ? `负债约占总资产 ${Math.round(debtRatio * 100)}%`
        : "补充资产后可评估负债比例",
    ),
    metric("data", "数据完整度", dataScore, `已有 ${dataPoints} 个有效数据点`),
  ];
  const score = clamp(
    cashflowScore * 0.3 + emergencyScore * 0.3 + debtScore * 0.25 + dataScore * 0.15,
  );
  const weakest = [...metrics].sort((a, b) => a.score - b.score)[0];
  const actionByKey: Record<FinancialHealth["metrics"][number]["key"], FinancialHealth["nextAction"]> = {
    cashflow: { title: "记录最近一笔收支", description: "补齐现金流后，体检结论会更准确。", href: "/cashflow" },
    emergency: { title: "建立应急金计划", description: "先把可随时使用的资金推进到 3—6 个月。", href: "/money-map?drawer=add-asset" },
    debt: { title: "核对负债与月供", description: "优先识别高成本、短期限负债。", href: "/money-map?drawer=add-asset" },
    data: { title: "补齐资金地图", description: "用一分钟补充资产、负债和目标。", href: "/money-map?drawer=add-asset" },
  };
  return {
    score,
    level: score >= 75 ? "稳健" : score >= 50 ? "需关注" : "待改善",
    metrics,
    nextAction: actionByKey[weakest.key],
    calculatedAt: new Date().toISOString(),
  };
}

export function simulateScenario(input: ScenarioInput): ScenarioResult {
  const monthlyBalance = input.monthlyIncome - input.monthlyExpense;
  let balance = input.initialCash - input.oneTimeExpense;
  let lowestCash = balance;
  const points = [{ month: 0, balance }];
  for (let month = 1; month <= input.months; month += 1) {
    balance += monthlyBalance;
    lowestCash = Math.min(lowestCash, balance);
    points.push({ month, balance });
  }
  const runwayMonths = monthlyBalance < 0
    ? Math.max(0, Math.floor((input.initialCash - input.oneTimeExpense) / Math.abs(monthlyBalance)))
    : null;
  return {
    endingCash: balance,
    lowestCash,
    monthlyBalance,
    sustainable: lowestCash >= 0,
    runwayMonths,
    points,
  };
}
