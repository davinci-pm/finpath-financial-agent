"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, ChevronDown, Clock, ExternalLink, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/layout/app-shell";
import { RiskNotice } from "@/components/finpath/risk-notice";
import { cn } from "@/lib/utils";
import { MOCK_ROUTE } from "@/lib/mock-data";

/**
 * P07 金融办事路线页
 * 当前步骤展开、其他步骤折叠；费用与备用方案通过二级入口查看。
 * 参考：P07-financial-route.png
 */
export default function RoutePage() {
  const route = MOCK_ROUTE;
  const [expanded, setExpanded] = useState<string | null>(
    route.steps.find((s) => s.status === "current")?.id ?? null,
  );
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(route.steps.flatMap((s) => s.checklist.map((c) => [c.id, c.done]))),
  );
  const [showFees, setShowFees] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = localStorage.getItem(`finpath:route:${route.id}`);
        if (stored) setChecked((current) => ({ ...current, ...JSON.parse(stored) }));
      } catch {
        // 忽略损坏的本地进度。
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [route.id]);

  const toggle = (id: string) => setExpanded((cur) => (cur === id ? null : id));

  return (
    <AppShell
      title={route.title}
      description={
        <span className="flex items-center gap-2 text-[15px]">
          <span className="text-muted-foreground">进行中 · 已完成 {route.completedCount}/{route.totalCount} 项</span>
        </span>
      }
      actions={
        <Button variant="outline" size="sm" className="rounded-xl" asChild>
          <Link href="/ask">重新描述需求</Link>
        </Button>
      }
    >
      {/* 条件标签 */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {route.conditions.map((c) => (
          <Badge key={c.label} variant="outline" className="rounded-full bg-white font-normal">
            {c.label}
          </Badge>
        ))}
        <Badge className="rounded-full bg-primary-soft text-primary">办理中</Badge>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[720px_1fr]">
        {/* 左：时间轴 */}
        <section className="space-y-4" aria-label="办理步骤">
          {route.steps.map((s) => {
            const open = expanded === s.id;
            return (
              <Card key={s.id} className="rounded-2xl bg-card shadow-card">
                <button
                  type="button"
                  onClick={() => toggle(s.id)}
                  className="flex w-full items-center justify-between gap-3 px-6 py-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-expanded={open}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={cn(
                        "font-number flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                        s.status === "done" && "bg-primary text-primary-foreground",
                        s.status === "current" && "bg-primary-soft text-primary ring-2 ring-primary/40",
                        s.status === "todo" && "bg-muted text-muted-foreground",
                      )}
                    >
                      {s.status === "done" ? <Check className="size-4" /> : s.position}
                    </span>
                    <div>
                      <h3 className="text-[16px] font-semibold text-foreground">{s.title}</h3>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3.5" aria-hidden />
                        预计 {s.estimatedMinutes} 分钟
                        {s.status === "current" ? " · 进行中" : ""}
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
                    aria-hidden
                  />
                </button>

                {open ? (
                  <div className="border-t border-border px-6 py-5">
                    <p className="text-[15px] leading-relaxed text-muted-foreground">{s.description}</p>
                    <ul className="mt-4 space-y-2.5">
                      {s.checklist.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => setChecked((prev) => {
                              const next = { ...prev, [c.id]: !prev[c.id] };
                              localStorage.setItem(`finpath:route:${route.id}`, JSON.stringify(next));
                              setSaved(false);
                              return next;
                            })}
                            className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                            aria-pressed={checked[c.id]}
                          >
                            <span
                              className={cn(
                                "flex size-5 shrink-0 items-center justify-center rounded-md border",
                                checked[c.id] ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white",
                              )}
                              aria-hidden
                            >
                              {checked[c.id] ? <Check className="size-3.5" /> : null}
                            </span>
                            <span
                              className={cn(
                                "text-[15px]",
                                checked[c.id] ? "text-muted-foreground line-through" : "text-foreground",
                              )}
                            >
                              {c.label}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    {s.officialEntry ? (
                      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                        <ExternalLink className="size-4" aria-hidden />
                        {s.officialEntry}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </Card>
            );
          })}

          <RiskNotice text="费用与规则可能随机构调整而变化，办理前请以官方最新说明为准。" />
        </section>

        {/* 右：信息侧栏 */}
        <aside className="space-y-4">
          <Card className="rounded-2xl bg-card shadow-card">
            <CardHeader>
              <CardTitle className="text-[16px] font-semibold text-foreground">材料清单</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {route.materials.map((m) => (
                <Badge key={m} variant="secondary" className="rounded-full">
                  {m}
                </Badge>
              ))}
            </CardContent>
          </Card>

          <Button variant="outline" className="w-full justify-between rounded-xl" onClick={() => setShowFees((value) => !value)}>
            查看费用说明
            <ChevronDown className={cn("size-4 transition-transform", showFees && "rotate-180")} aria-hidden />
          </Button>
          {showFees ? (
            <Card className="rounded-2xl bg-card shadow-card">
              <CardHeader>
                <CardTitle className="text-[16px] font-semibold text-foreground">可能费用</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {route.possibleFees.map((f) => (
                  <p key={f} className="flex items-start gap-2 text-sm leading-relaxed text-foreground">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning" aria-hidden />
                    {f}
                  </p>
                ))}
                <p className="pt-1 text-xs text-muted-foreground">具体金额以机构核验为准，不承诺价格。</p>
              </CardContent>
            </Card>
          ) : null}

          <Card className="rounded-2xl bg-card shadow-card">
            <CardHeader>
              <CardTitle className="text-[16px] font-semibold text-foreground">常见失败原因</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {route.failureReasons.map((f) => (
                <p key={f} className="flex items-start gap-2 text-sm leading-relaxed text-foreground">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-destructive/60" aria-hidden />
                  {f}
                </p>
              ))}
            </CardContent>
          </Card>

          <Button variant="outline" className="w-full justify-between rounded-xl" onClick={() => setShowAlternatives((value) => !value)}>
            查看备用方案
            <ChevronDown className={cn("size-4 transition-transform", showAlternatives && "rotate-180")} aria-hidden />
          </Button>
          {showAlternatives ? (
            <Card className="rounded-2xl bg-card shadow-card">
              <CardHeader>
                <CardTitle className="text-[16px] font-semibold text-foreground">备用路径</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {route.alternatives.map((a) => (
                  <p key={a} className="flex items-start gap-2 text-sm leading-relaxed text-foreground">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                    {a}
                  </p>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <p className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5" aria-hidden />
            适用地区：{route.region} · 更新于 {route.updatedAt}
          </p>
        </aside>
      </div>

      {/* 底部操作 */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button className="rounded-xl px-7" onClick={() => {
          localStorage.setItem(`finpath:route:${route.id}`, JSON.stringify(checked));
          setSaved(true);
        }}>{saved ? "进度已保存" : "保存进度"}</Button>
        <Button variant="outline" className="rounded-xl px-7" asChild>
          <Link href="/ask">问 AI 一个细节</Link>
        </Button>
      </div>
    </AppShell>
  );
}
