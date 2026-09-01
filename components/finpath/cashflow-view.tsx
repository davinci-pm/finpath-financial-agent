"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowDownRight, ArrowUpRight, Download, Plus, Trash2, Upload } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTransaction, deleteTransaction, fetchFinancialHealth, fetchTransactions, importTransactions } from "@/lib/api-client";
import { parseTransactionsCsv } from "@/lib/finance/csv";
import type { CashflowSummary, Transaction, TransactionType } from "@/lib/types";

const today = new Date().toISOString().slice(0, 10);
const formatCNY = (value: number) => `¥${value.toLocaleString("zh-CN")}`;

export function CashflowView() {
  const [month, setMonth] = useState(today.slice(0, 7));
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<CashflowSummary | null>(null);
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("日常生活");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    const [list, health] = await Promise.all([fetchTransactions(month), fetchFinancialHealth(month)]);
    setTransactions(list.transactions);
    setSummary(health.cashflow);
  }, [month]);

  useEffect(() => {
    let active = true;
    Promise.all([fetchTransactions(month), fetchFinancialHealth(month)])
      .then(([list, health]) => {
        if (!active) return;
        setTransactions(list.transactions);
        setSummary(health.cashflow);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "加载失败");
      });
    return () => { active = false; };
  }, [month]);

  const categories = useMemo(() => type === "income"
    ? ["工资", "奖金", "副业", "投资收入", "其他收入"]
    : ["日常生活", "住房", "交通", "教育", "医疗", "还款", "娱乐", "其他支出"], [type]);

  const submit = () => {
    const value = Math.round(Number(amount));
    if (!value || value <= 0) return setError("请输入大于 0 的整数金额");
    setError(null);
    startTransition(async () => {
      try {
        await createTransaction({ type, amount: value, category, description, date, source: "manual" });
        setAmount(""); setDescription("");
        await reload();
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "保存失败");
      }
    });
  };

  const importFile = async (file?: File) => {
    if (!file) return;
    setError(null);
    try {
      const rows = parseTransactionsCsv(await file.text());
      if (rows.length > 500) throw new Error("单次最多导入 500 行");
      startTransition(async () => {
        try { await importTransactions(rows); await reload(); }
        catch (reason) { setError(reason instanceof Error ? reason.message : "导入失败"); }
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "CSV 无法解析");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <AppShell title="月度现金流" description="记录钱从哪里来、到哪里去；数据越完整，财务体检越准确。" actions={
      <div className="flex items-center gap-2">
        <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="w-[145px] bg-card" />
        <Button variant="outline" asChild><a href={`/api/transactions/export?month=${month}`}><Download className="size-4" />导出</a></Button>
      </div>
    }>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "本月收入", value: summary?.income ?? 0, tone: "text-primary", icon: ArrowUpRight },
          { label: "本月支出", value: summary?.expense ?? 0, tone: "text-warning", icon: ArrowDownRight },
          { label: "本月结余", value: summary?.balance ?? 0, tone: (summary?.balance ?? 0) >= 0 ? "text-primary" : "text-destructive", icon: Plus },
          { label: "结余率", value: `${summary?.savingsRate ?? 0}%`, tone: "text-foreground", icon: ArrowUpRight },
        ].map(({ label, value, tone, icon: Icon }) => (
          <Card key={label} className="interactive-card shadow-card"><CardContent className="p-5"><div className="flex items-center justify-between text-sm text-muted-foreground"><span>{label}</span><Icon className={`size-4 ${tone}`} /></div><strong className={`font-number mt-3 block text-2xl ${tone}`}>{typeof value === "number" ? formatCNY(value) : value}</strong></CardContent></Card>
        ))}
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-[380px_1fr]">
        <Card className="shadow-card">
          <CardHeader><CardTitle>记一笔</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {(["expense", "income"] as TransactionType[]).map((item) => <Button key={item} variant={type === item ? "default" : "outline"} onClick={() => { setType(item); setCategory(item === "income" ? "工资" : "日常生活"); }}>{item === "expense" ? "支出" : "收入"}</Button>)}
            </div>
            <div><Label htmlFor="amount">金额（元）</Label><Input id="amount" inputMode="numeric" className="mt-1.5 h-11 font-number" value={amount} onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))} placeholder="0" /></div>
            <div><Label>分类</Label><Select value={category} onValueChange={(value) => value && setCategory(value)}><SelectTrigger className="mt-1.5 w-full"><SelectValue /></SelectTrigger><SelectContent>{categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
            <div><Label htmlFor="cashflow-description">说明</Label><Input id="cashflow-description" className="mt-1.5" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="例如：超市、工资" maxLength={120} /></div>
            <div><Label htmlFor="cashflow-date">日期</Label><Input id="cashflow-date" type="date" className="mt-1.5" value={date} onChange={(event) => setDate(event.target.value)} /></div>
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            <Button className="w-full" disabled={pending} onClick={submit}>{pending ? "正在保存…" : "保存记录"}</Button>
            <div className="relative py-1 text-center text-xs text-muted-foreground before:absolute before:left-0 before:right-0 before:top-1/2 before:border-t"><span className="relative bg-card px-2">或批量导入</span></div>
            <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(event) => void importFile(event.target.files?.[0])} />
            <Button variant="outline" className="w-full" disabled={pending} onClick={() => fileRef.current?.click()}><Upload className="size-4" />导入 CSV</Button>
            <p className="text-xs leading-relaxed text-muted-foreground">支持列名：日期/date、金额/amount、类型/type、分类/category、说明/description。支出金额可用负数。</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader><CardTitle>本月明细</CardTitle></CardHeader>
          <CardContent>
            {transactions.length ? <ul className="divide-y divide-border">{transactions.map((item) => (
              <li key={item.id} className="group flex items-center gap-3 py-3.5">
                <span className={`flex size-9 items-center justify-center rounded-xl ${item.type === "income" ? "bg-primary-soft text-primary" : "bg-warning-soft text-warning"}`}>{item.type === "income" ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.description || item.category}</p><p className="text-xs text-muted-foreground">{item.date} · {item.category} · {item.source === "csv" ? "CSV 导入" : "手动记录"}</p></div>
                <strong className={`font-number text-sm ${item.type === "income" ? "text-primary" : "text-foreground"}`}>{item.type === "income" ? "+" : "-"}{formatCNY(item.amount)}</strong>
                <Button size="icon" variant="ghost" className="opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100" aria-label="删除记录" onClick={() => startTransition(async () => { await deleteTransaction(item.id); await reload(); })}><Trash2 className="size-4" /></Button>
              </li>
            ))}</ul> : <div className="py-16 text-center"><ReceiptTextEmpty /><p className="mt-3 font-medium">这个月还没有记录</p><p className="mt-1 text-sm text-muted-foreground">先记一笔，或从银行账单导入 CSV。</p></div>}
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}

function ReceiptTextEmpty() {
  return <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary"><ArrowDownRight className="size-5" /></span>;
}
