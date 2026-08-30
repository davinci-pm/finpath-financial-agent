"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronDown, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionChecklist } from "@/components/finpath/action-checklist";
import { AllocationCard } from "@/components/finpath/allocation-card";
import { ConclusionCard } from "@/components/finpath/conclusion-card";
import { ErrorState } from "@/components/finpath/error-state";
import { RiskNotice } from "@/components/finpath/risk-notice";
import { SavePlanTask } from "@/components/finpath/save-plan-task";
import { SkeletonState } from "@/components/finpath/skeleton-state";
import { SourceBadge } from "@/components/finpath/source-badge";
import { fetchPlan } from "@/lib/api-client";
import { BUILTIN_SOURCES } from "@/lib/server/ai/mock";
import { MOCK_PLAN } from "@/lib/mock-data";
import type { PlanRecord } from "@/lib/types";

/**
 * P03 个性化金融行动路径结果页（AI 诊断链路）
 * 数据来自 GET /api/plans/:id（规则引擎 + 模型解释）；保存任务 → POST /api/tasks → P10。
 */
export default function PlanPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = use(params);
  const [plan, setPlan] = useState<PlanRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { plan: p } = await fetchPlan(planId);
      setPlan(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { plan: p } = await fetchPlan(planId);
        if (cancelled) return;
        setPlan(p);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "加载失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [planId]);

  if (loading && !plan) {
    return (
      <PlanShell>
        <SkeletonState rows={6} />
      </PlanShell>
    );
  }
  if (error && !plan) {
    return (
      <PlanShell>
        <ErrorState description={error} onRetry={reload} />
      </PlanShell>
    );
  }
  if (!plan) return null;

  const sources = BUILTIN_SOURCES.filter((s) => plan.sourceIds.includes(s.id));

  return (
    <PlanShell>
      {/* 结论卡 */}
      <ConclusionCard
        conclusion={plan.conclusion}
        summary={plan.summary}
        applicableConditions={plan.hardConstraints}
        updatedAt={plan.updatedAt.slice(0, 10)}
      />

      {/* 三列路径比较 */}
      <section aria-label="资金路径比较">
        <h2 className="section-title mb-4 text-foreground">两条路之外，先看三个资金用途</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {plan.buckets.map((b) => (
            <AllocationCard key={b.key} bucket={b} highlight={b.key === "reserve"} />
          ))}
        </div>
      </section>

      {/* 行动清单 + 依据与来源 */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">
        <Card className="rounded-2xl bg-card shadow-card">
          <CardHeader>
            <CardTitle className="text-[20px] font-semibold text-foreground">
              下一步行动清单
            </CardTitle>
            <p className="text-sm text-muted-foreground">先完成高优先级事项，再逐步推进。</p>
          </CardHeader>
          <CardContent>
            <ActionChecklist items={plan.actionItems} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-2xl bg-card shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-1.5 text-[17px] font-semibold text-foreground">
                为什么这样分析
                <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {plan.rationale.length > 0 ? (
                plan.rationale.map((r, i) => (
                  <p key={i} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
                    <span className="font-number text-primary">·</span>
                    {r}
                  </p>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  依据规则引擎：期限、应急储备、负债与波动容忍条件。
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl bg-card shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-1.5 text-[17px] font-semibold text-foreground">
                来源与说明
                <FileText className="size-4 text-muted-foreground" aria-hidden />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sources.map((s) => (
                <div key={s.id} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.title}</p>
                    <p className="text-xs text-muted-foreground">更新于 {s.updatedAt}</p>
                  </div>
                  <SourceBadge type={s.type} />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">{plan.disclaimer}</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 风险提示 */}
      <div className="space-y-2">
        {plan.risks.map((r) => (
          <RiskNotice key={r} text={r} />
        ))}
      </div>

      {/* 知识卡（静态） */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {MOCK_PLAN.relatedKnowledge.map((k) => (
          <Link key={k.title} href={k.href} className="group outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl">
            <Card className="h-full rounded-2xl bg-card shadow-card transition-colors group-hover:bg-primary-soft/40">
              <CardContent className="p-6">
                <h3 className="text-[16px] font-semibold text-foreground">{k.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{k.desc}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  查看知识卡
                  <ArrowRight className="size-4" aria-hidden />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      {/* 主操作：保存为任务（POST /api/tasks → 跳转 P10） */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <SavePlanTask
          planId={plan.id}
          title="安排资金行动路径"
          summary={plan.summary}
          nextAction={plan.actionItems[0]?.title}
          steps={plan.actionItems.map((a) => ({ title: a.title }))}
          size="lg"
          className="gap-1.5 rounded-xl px-7"
        >
          保存为我的金融任务
          <ArrowRight className="size-4" aria-hidden />
        </SavePlanTask>
        <Button size="lg" variant="outline" className="rounded-xl px-7" asChild>
          <Link href="/ask">继续追问</Link>
        </Button>
      </div>
    </PlanShell>
  );
}

/** P03 页面框架（未登录简化框架） */
function PlanShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between px-8 py-4">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" aria-hidden />
          返回首页
        </Link>
        <h1 className="page-title !text-2xl font-bold text-foreground">你的资金安排路径</h1>
        <span className="w-[92px]" aria-hidden />
      </header>
      <main className="mx-auto w-full max-w-[1200px] flex-1 space-y-6 px-8 pb-10">
        {children}
      </main>
    </div>
  );
}
