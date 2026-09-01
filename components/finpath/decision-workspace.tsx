"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, FileDiff, HeartPulse, ReceiptText, Sparkles } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fetchFinancialHealth } from "@/lib/api-client";
import { simulateScenario } from "@/lib/finance/workspace";
import type { FinancialHealth, ScenarioInput } from "@/lib/types";

const formatCNY = (value: number) => `¥${value.toLocaleString("zh-CN")}`;

const currentMonth = new Date().toISOString().slice(0, 7);
const initialScenario: ScenarioInput = {
  initialCash: 50000,
  monthlyIncome: 12000,
  monthlyExpense: 8000,
  oneTimeExpense: 30000,
  months: 12,
};

export function DecisionWorkspace() {
  const [health, setHealth] = useState<FinancialHealth | null>(null);
  const [scenario, setScenario] = useState(initialScenario);
  const [error, setError] = useState<string | null>(null);
  const result = useMemo(() => simulateScenario(scenario), [scenario]);

  useEffect(() => {
    fetchFinancialHealth(currentMonth)
      .then((data) => setHealth(data.health))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "体检加载失败"));
  }, []);

  const updateNumber = (key: keyof ScenarioInput, value: string) => {
    const parsed = Math.max(0, Math.round(Number(value) || 0));
    setScenario((current) => ({ ...current, [key]: parsed }));
  };

  return (
    <AppShell
      title="财务决策工作台"
      description="把资产、收支和合同信息放在一起，先计算，再决定下一步。"
      actions={<Button asChild><Link href="/ask">让 AI 帮我解释</Link></Button>}
    >
      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.4fr]">
        <Card className="interactive-card overflow-hidden border-0 bg-[linear-gradient(145deg,#173f37,#276b5d)] text-white shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-white/75"><HeartPulse className="size-4" />财务体检</span>
              <Badge className="border-0 bg-white/12 text-white">规则计算 · 非模型猜测</Badge>
            </div>
            <div className="mt-6 flex items-end gap-3">
              <strong className="font-number text-6xl leading-none">{health?.score ?? "--"}</strong>
              <span className="pb-1 text-white/70">/ 100 · {health?.level ?? "计算中"}</span>
            </div>
            {error ? <p className="mt-4 text-sm text-red-100">{error}</p> : null}
            <div className="mt-6 grid grid-cols-2 gap-2">
              {health?.metrics.map((metric) => (
                <div key={metric.key} className="rounded-xl bg-white/10 p-3 backdrop-blur">
                  <div className="flex items-center justify-between text-sm">
                    <span>{metric.label}</span><span className="font-number">{metric.score}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/15">
                    <div className="h-full rounded-full bg-white/80 transition-[width] duration-700" style={{ width: `${metric.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
            {health ? (
              <Link href={health.nextAction.href} className="mt-5 flex items-center justify-between rounded-xl bg-white px-4 py-3 text-foreground transition-transform hover:-translate-y-0.5">
                <span><b className="block text-sm">{health.nextAction.title}</b><small className="text-muted-foreground">{health.nextAction.description}</small></span>
                <ArrowRight className="size-4 text-primary" />
              </Link>
            ) : null}
          </CardContent>
        </Card>

        <Card className="interactive-card shadow-card">
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div><CardTitle>如果现在做这笔决定</CardTitle><p className="mt-1 text-sm text-muted-foreground">参数变化后即时重算，不消耗 AI 额度。</p></div>
            <Badge variant={result.sustainable ? "secondary" : "destructive"}>{result.sustainable ? "现金可持续" : "可能出现缺口"}</Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {([
                ["initialCash", "现有现金"], ["monthlyIncome", "月收入"], ["monthlyExpense", "月支出"],
                ["oneTimeExpense", "一次支出"], ["months", "推演月数"],
              ] as Array<[keyof ScenarioInput, string]>).map(([key, label]) => (
                <label key={key} className="text-xs text-muted-foreground">{label}
                  <Input className="mt-1 font-number" inputMode="numeric" value={scenario[key]} onChange={(event) => updateNumber(key, event.target.value)} />
                </label>
              ))}
            </div>
            <div className="mt-5 h-[190px] rounded-xl bg-primary-soft/45 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={result.points}>
                  <defs><linearGradient id="scenarioFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#276b5d" stopOpacity={0.35}/><stop offset="100%" stopColor="#276b5d" stopOpacity={0}/></linearGradient></defs>
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => formatCNY(Number(value))} labelFormatter={(value) => `第 ${value} 个月`} />
                  <Area type="monotone" dataKey="balance" stroke="#276b5d" strokeWidth={2.5} fill="url(#scenarioFill)" animationDuration={450} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <span>期末现金 <b className="font-number">{formatCNY(result.endingCash)}</b></span>
              <span>每月结余 <b className="font-number">{formatCNY(result.monthlyBalance)}</b></span>
              {result.runwayMonths !== null ? <span>预计可支撑 <b>{result.runwayMonths} 个月</b></span> : null}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-3">
        {[
          { icon: ReceiptText, title: "月度现金流", desc: "导入账单或手动记录，判断结余与支出结构。", href: "/cashflow", tag: "可导入 CSV" },
          { icon: FileDiff, title: "产品文档对比", desc: "把两份合同逐字段并排，优先看风险、费用和退出条件。", href: "/documents/compare", tag: "基于原文" },
          { icon: Sparkles, title: "条件化行动方案", desc: "AI 负责解释，规则负责约束，最后落成可追踪任务。", href: "/ask", tag: "不是闲聊" },
        ].map((item) => (
          <Link key={item.title} href={item.href} className="group rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Card className="interactive-card h-full shadow-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between"><span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary"><item.icon className="size-5" /></span><span className="text-xs text-muted-foreground">{item.tag}</span></div>
                <h2 className="mt-4 font-semibold">{item.title}</h2><p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                <span className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">开始使用 <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <div className="mt-5 flex items-center gap-2 rounded-xl border border-primary/15 bg-primary-soft/60 px-4 py-3 text-sm text-foreground">
        <CheckCircle2 className="size-4 shrink-0 text-primary" /> 所有体检与推演均可解释、可复算；AI 只参与文字说明，不替代规则计算。
      </div>
    </AppShell>
  );
}
