import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronDown, FileText, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionChecklist } from "@/components/finpath/action-checklist";
import { AllocationCard } from "@/components/finpath/allocation-card";
import { ConclusionCard } from "@/components/finpath/conclusion-card";
import { RiskNotice } from "@/components/finpath/risk-notice";
import { SourceBadge } from "@/components/finpath/source-badge";
import { MOCK_PLAN } from "@/lib/mock-data";

/**
 * P03 个性化金融行动路径结果页（未登录简化框架）
 * 结论先行 → 三桶比较 → 行动清单 → 依据与来源 → 知识卡与相似经验。
 * 参考：P03-action-plan.png
 */
export default async function PlanPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  void planId; // 阶段 4 起按 planId 查询真实数据
  const plan = MOCK_PLAN;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* 顶部 */}
      <header className="flex items-center justify-between px-8 py-4">
        <Link
          href="/diagnosis/demo-session"
          className="flex items-center gap-1.5 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" aria-hidden />
          返回修改条件
        </Link>
        <h1 className="page-title !text-2xl font-bold text-foreground">你的资金安排路径</h1>
        <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" asChild>
          <Link href="/tasks">
            <Save className="size-4" aria-hidden />
            保存这份路径
          </Link>
        </Button>
      </header>

      <main className="mx-auto w-full max-w-[1200px] flex-1 space-y-6 px-8 pb-10">
        {/* 结论卡 */}
        <ConclusionCard
          conclusion={plan.conclusion}
          summary={plan.summary}
          applicableConditions={plan.applicableConditions}
          updatedAt={plan.updatedAt}
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
                {plan.rationale.map((r, i) => (
                  <p key={i} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
                    <span className="font-number text-primary">·</span>
                    {r}
                  </p>
                ))}
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
                {plan.sources.map((s) => (
                  <div key={s.id} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{s.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.region ? `${s.region} · ` : ""}更新于 {s.updatedAt}
                      </p>
                    </div>
                    <SourceBadge type={s.type} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 风险提示 */}
        <RiskNotice text="以上为行动教育建议，不构成具体投资推荐。不承诺收益，具体产品信息请以官方文件为准。" />

        {/* 知识卡与相似经验 */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {plan.relatedKnowledge.map((k) => (
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

        {/* 相似用户经验预览 */}
        <Card className="rounded-2xl bg-card shadow-card">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[16px] font-semibold text-foreground">和你情况相近的经验</h3>
              <SourceBadge type="personal" />
            </div>
            {plan.peerExperiences.map((pe) => (
              <div key={pe.id} className="mt-3 rounded-xl bg-muted/60 px-4 py-3 text-sm leading-relaxed text-foreground">
                <p>
                  <span className="font-medium">{pe.scope}</span>
                  <span className="text-muted-foreground"> · {pe.region} · {pe.purpose} · {pe.date}</span>
                </p>
                {pe.pitfalls[0] ? (
                  <p className="mt-1 text-muted-foreground">踩坑：{pe.pitfalls[0]}</p>
                ) : null}
              </div>
            ))}
            <p className="mt-3 text-xs text-muted-foreground">
              个人经历不等于官方规则，信息可能已变化。
            </p>
          </CardContent>
        </Card>

        {/* 主操作 */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button size="lg" className="gap-1.5 rounded-xl px-7" asChild>
            <Link href="/tasks">
              保存为我的金融任务
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="rounded-xl px-7" asChild>
            <Link href="/diagnosis/demo-session">继续追问</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
