"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Banknote,
  Landmark,
  PiggyBank,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { AppShell } from "@/components/layout/app-shell";
import { AIQuestionInput } from "@/components/finpath/ai-question-input";
import { AssetFormDrawer } from "@/components/finpath/asset-form-drawer";
import { AssetSummaryCard } from "@/components/finpath/asset-summary-card";
import { ProgressBar } from "@/components/finpath/progress-bar";
import { RiskNotice } from "@/components/finpath/risk-notice";
import { SkeletonState } from "@/components/finpath/skeleton-state";
import { TaskCard } from "@/components/finpath/task-card";
import { ErrorState } from "@/components/finpath/error-state";
import { createAsset, createDiagnosis, fetchMoneyMap, fetchTasks } from "@/lib/api-client";
import type { MoneyMap, Task } from "@/lib/types";

const CHART_COLORS = ["#276B5D", "#6E9E8E", "#D7953F", "#8FA8A0", "#C65B5B"];

const formatCNY = (n: number) => `¥${n.toLocaleString("zh-CN")}`;

/**
 * P08 我的资金地图 / 个人金融驾驶舱（client 视图）
 * 数据来自 GET /api/money-map；P09 保存资产后立即重新拉取聚合（P09→P08 闭环）。
 */
export function MoneyMapView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(
    searchParams.get("drawer") === "add-asset",
  );
  const [hideAmounts, setHideAmounts] = useState(false);
  const [map, setMap] = useState<MoneyMap | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [mapData, tasksData] = await Promise.all([fetchMoneyMap(), fetchTasks()]);
      setMap(mapData);
      setTasks(tasksData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始加载：异步取数，避免 effect 内同步 setState
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [mapData, tasksData] = await Promise.all([fetchMoneyMap(), fetchTasks()]);
        if (cancelled) return;
        setMap(mapData);
        setTasks(tasksData);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "加载失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hide = (v: string) => (hideAmounts ? "¥•••" : v);

  // 资产分布聚合（hooks 必须在所有条件 return 之前调用）
  const chartData = useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const a of map?.assets ?? []) {
      const v =
        a.amountExact ??
        Math.round(((a.amountMin ?? 0) + (a.amountMax ?? 0)) / 2);
      byCategory.set(a.category, (byCategory.get(a.category) ?? 0) + v);
    }
    return Array.from(byCategory.entries()).map(([name, value], i) => ({
      name,
      value,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [map]);

  if (loading && !map) {
    return (
      <AppShell title="我的资金地图">
        <SkeletonState rows={5} className="mt-6" />
      </AppShell>
    );
  }

  if (error && !map) {
    return (
      <AppShell title="我的资金地图">
        <ErrorState description={error} onRetry={reload} className="mt-6" />
      </AppShell>
    );
  }

  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");

  return (
    <AppShell
      title="下午好，林默"
      description="先看全局，再决定下一步。"
      actions={
        <>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            隐藏金额
            <Switch checked={hideAmounts} onCheckedChange={setHideAmounts} aria-label="隐藏金额" />
          </label>
          <span className="hidden text-sm text-muted-foreground md:inline">
            更新于 {map?.updatedAt ?? "今天"}
          </span>
          <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" onClick={reload}>
            <RefreshCw className="size-4" aria-hidden />
            用一分钟更新
          </Button>
        </>
      }
    >
      <div className="mb-6">
        <AIQuestionInput
          placeholder="现在最想解决什么金融问题？"
          attachmentHint=""
          loading={asking}
          onSubmit={async (question) => {
            setAsking(true);
            setAskError(null);
            try {
              const { session } = await createDiagnosis(question);
              router.push(`/diagnosis/${session.id}`);
            } catch (error) {
              setAskError(error instanceof Error ? error.message : "无法开始诊断，请稍后重试");
              setAsking(false);
            }
          }}
        />
        {askError ? <p role="alert" className="mt-2 text-sm text-destructive">{askError}</p> : null}
      </div>

      {/* 指标卡 */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="资金指标">
        <AssetSummaryCard label="总资产" value={hide(formatCNY(map?.totalAssets ?? 0))} icon={Wallet} />
        <AssetSummaryCard label="总负债" value={hide(formatCNY(map?.totalLiabilities ?? 0))} icon={Landmark} tone="warning" />
        <AssetSummaryCard label="净资产" value={hide(formatCNY(map?.netAssets ?? 0))} icon={PiggyBank} />
        <AssetSummaryCard label="应急覆盖" value={`${map?.emergencyCoverageMonths ?? 0} 个月`} icon={Banknote} />
      </section>

      {/* 资产分布 + 财务目标 */}
      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="rounded-2xl bg-card shadow-card">
          <CardHeader>
            <CardTitle className="text-[18px] font-semibold text-foreground">资产分布</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
            {chartData.length > 0 ? (
              <>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={58}
                        outerRadius={88}
                        paddingAngle={2}
                        strokeWidth={0}
                      >
                        {chartData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => hide(formatCNY(Number(v)))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="space-y-2.5">
                  {chartData.map((d) => (
                    <li key={d.name} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span className="size-2.5 rounded-full" style={{ background: d.color }} aria-hidden />
                        {d.name}
                      </span>
                      <span className="font-number font-medium text-foreground">
                        {hide(formatCNY(d.value))}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="col-span-2 py-10 text-center text-sm text-muted-foreground">
                暂无资产，点击右上角「用一分钟更新」或添加一项资产开始。
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl bg-card shadow-card">
          <CardHeader>
            <CardTitle className="text-[18px] font-semibold text-foreground">财务目标</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {map?.goals.length ? (
              map.goals.map((g) => (
                <div key={g.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{g.title}</span>
                    <span className="font-number text-muted-foreground">
                      {hide(`${formatCNY(g.currentAmount)} / ${formatCNY(g.targetAmount)}`)}
                    </span>
                  </div>
                  <ProgressBar value={g.progress} showLabel className="mt-2" />
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">暂无财务目标。</p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* 状态诊断 + 今日行动 */}
      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl bg-card shadow-card">
          <CardHeader>
            <CardTitle className="text-[18px] font-semibold text-foreground">AI 状态诊断</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <RiskNotice
              text={`流动性：应急覆盖 ${map?.emergencyCoverageMonths ?? 0} 个月，建议向 6 个月目标推进`}
              tone="warning"
            />
            <RiskNotice text="负债：房贷占净资产比例偏高，关注还款计划" tone="warning" />
            <RiskNotice text="数据完整度：2 项资产信息待补充" tone="info" />
          </CardContent>
        </Card>

        <Card className="rounded-2xl bg-card shadow-card">
          <CardHeader>
            <CardTitle className="text-[18px] font-semibold text-foreground">今天先处理这三件事</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { title: "补充应急资金信息", desc: "更新资金地图数据", href: "/money-map?drawer=add-asset" },
              { title: "看懂一份到期理财", desc: "上传产品文件并确认", href: "/documents/new" },
              { title: "继续境外支付卡任务", desc: "比较境外交易费用", href: "/tasks/t-overseas-card" },
            ].map((a) => (
              <Link
                key={a.title}
                href={a.href}
                className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-white px-4 py-3.5 outline-none transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div>
                  <p className="text-[15px] font-medium text-foreground">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.desc}</p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden />
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* 进行中的金融任务 */}
      <section className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-title text-foreground">进行中的金融任务</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/tasks">
              查看全部
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </div>
        {inProgressTasks.length ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {inProgressTasks.map((t) => (
              <TaskCard key={t.id} task={t} />
            ))}
          </div>
        ) : (
          <Card className="rounded-2xl bg-card shadow-card">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              暂无进行中的任务。
            </CardContent>
          </Card>
        )}
      </section>

      {/* 保存成功提示 */}
      {savedNotice ? (
        <p className="mt-4 rounded-xl bg-primary-soft px-4 py-3 text-sm text-foreground">
          已保存到资金地图，聚合数据已更新。
        </p>
      ) : null}

      {/* P09 添加资产抽屉：保存 → POST /api/assets → 刷新资金地图 */}
      <AssetFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onSave={async (data) => {
          await createAsset(data);
          await reload();
          setSavedNotice(true);
        }}
      />
    </AppShell>
  );
}
