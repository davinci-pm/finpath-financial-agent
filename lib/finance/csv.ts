import type { Transaction } from "@/lib/types";

type CreateTransactionInput = Omit<Transaction, "id" | "createdAt">;

// CSV 安全处理参考 Actual Budget（MIT）：导出时中和公式触发字符。
const FORMULA_TRIGGERS = /^[=+\-@\t\r]/;

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      cells.push(value.trim());
      value = "";
    } else {
      value += char;
    }
  }
  cells.push(value.trim());
  return cells;
}

const normalizeHeader = (value: string) => value.replace(/^\uFEFF/, "").trim().toLowerCase();

export function parseTransactionsCsv(content: string): CreateTransactionInput[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error("CSV 至少需要表头和一行数据");
  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const aliases: Record<string, string[]> = {
    date: ["date", "日期", "交易日期"],
    type: ["type", "类型", "收支类型"],
    amount: ["amount", "金额", "交易金额"],
    category: ["category", "分类", "类别"],
    description: ["description", "备注", "说明", "商户"],
  };
  const indexOf = (key: keyof typeof aliases) =>
    headers.findIndex((header) => aliases[key].includes(header));
  const indexes = {
    date: indexOf("date"),
    type: indexOf("type"),
    amount: indexOf("amount"),
    category: indexOf("category"),
    description: indexOf("description"),
  };
  if (indexes.date < 0 || indexes.amount < 0) {
    throw new Error("CSV 必须包含日期/date 与金额/amount 列");
  }
  return lines.slice(1).map((line, rowIndex) => {
    const cells = splitCsvLine(line);
    const rawAmount = (cells[indexes.amount] ?? "").replace(/[￥¥,\s]/g, "");
    const parsedAmount = Number(rawAmount.replace(/^\((.+)\)$/, "-$1"));
    if (!Number.isFinite(parsedAmount) || parsedAmount === 0) {
      throw new Error(`第 ${rowIndex + 2} 行金额无效`);
    }
    const rawType = indexes.type >= 0 ? cells[indexes.type]?.toLowerCase() : "";
    const type = rawType === "income" || rawType === "收入" || parsedAmount > 0
      ? "income"
      : "expense";
    const date = cells[indexes.date] ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error(`第 ${rowIndex + 2} 行日期需为 YYYY-MM-DD`);
    }
    return {
      date,
      type,
      amount: Math.round(Math.abs(parsedAmount)),
      category: (indexes.category >= 0 && cells[indexes.category]) || "未分类",
      description: (indexes.description >= 0 && cells[indexes.description]) || "CSV 导入",
      source: "csv",
    };
  });
}

function escapeCsv(value: string | number): string {
  let safe = String(value);
  if (FORMULA_TRIGGERS.test(safe)) safe = `'${safe}`;
  return /[",\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function transactionsToCsv(transactions: Transaction[]): string {
  const rows = [
    ["日期", "类型", "金额", "分类", "说明", "来源"],
    ...transactions.map((item) => [
      item.date,
      item.type === "income" ? "收入" : "支出",
      item.amount,
      item.category,
      item.description,
      item.source === "csv" ? "CSV" : "手动",
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n")}`;
}
