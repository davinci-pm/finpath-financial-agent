"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronRight,
  CircleAlert,
  ExternalLink,
  Flag,
  MessageCircleQuestion,
  MoreHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/layout/app-shell";
import { ProgressBar } from "@/components/finpath/progress-bar";
import { RiskNotice } from "@/components/finpath/risk-notice";
import { SkeletonState } from "@/components/finpath/skeleton-state";
import { ErrorState } from "@/components/finpath/error-state";
import { SourceBadge } from "@/components/finpath/source-badge";
import { MOCK_PEER_EXPERIENCES } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { completeTaskStep, fetchTask } from "@/lib/api-client";
import type { Task, TaskStep, TaskStepStatus } from "@/lib/types";

/**
 * P11 金融任务详情与相似经验
 * 数据来自 GET /api/tasks/:id；完成步骤 → PATCH 步骤 API，进度立即更新（P10/P11 一致）。
 */
export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = use(params);
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stepStatuses, setStepStatuses] = useState<Record<string, TaskStepStatus>>({});
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const t = await fetchTask(taskId);
      setTask(t);
      setStepStatuses(Object.fromEntries(t.steps.map((s) => [s.id, s.status])));
      setExpandedStep(t.steps.find((s) => s.status === "doing")?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const t = await fetchTask(taskId);
        if (cancelled) return;
        setTask(t);
        setStepStatuses(Object.fromEntries(t.steps.map((s) => [s.id, s.status])));
        setExpandedStep(t.steps.find((s) => s.status === "doing")?.id ?? null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "加载失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  const completeStep = async (stepId: string) => {
    if (!task) return;
    // 乐观更新
    setStepStatuses((prev) => ({ ...prev, [stepId]: "done" }));
    try {
      const updated = await completeTaskStep(task.id, stepId);
      setTask(updated);
      setStepStatuses(Object.fromEntries(updated.steps.map((s) => [s.id, s.status])));
    } catch (e) {
      setError(e instanceof Error ? e.message : "步骤更新失败");
      await reload();
    }
  };

  if (loading && !task) {
    return (
      <AppShell title="任务详情">
        <SkeletonState rows={5} className="mt-6" />
      </AppShell>
    );
  }

  if (error && !task) {
    return (
      <AppShell title="任务详情">
        <ErrorState description={error} onRetry={reload} className="mt-6" />
      </AppShell>
    );
  }

  if (!task) return null;

  const doneCount = task.steps.filter((s) => stepStatuses[s.id] === "done").length;
  const percent = Math.round((doneCount / Math.max(task.steps.length, 1)) * 100);

  return (
    <AppShell
      title={task.title}
      actions={
        <>
          <Button variant="outline" size="sm" className="gap-1.5 rounded-xl">
            <MessageCircleQuestion className="size-4" aria-hidden />
            问 AI
          </Button>
          <Button variant="ghost" size="icon" className="rounded-xl" aria-label="更多操作">
            <MoreHorizontal className="size-4" aria-hidden />
          </Button>
        </>
      }
    >
      {/* 面包屑 + 状态 */}
      <nav aria-label="面包屑" className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/tasks" className="outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
          我的任务
        </Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <span className="text-foreground">{task.title}</span>
        <Badge className="ml-2 rounded-full bg-primary-soft text-primary">
          {task.status === "completed" ? "已完成" : task.status === "pending" ? "待处理" : "进行中"}
        </Badge>
      </nav>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[760px_1fr]">
        {/* 左：任务主体 */}
        <section className="space-y-5">
          <Card className="rounded-2xl bg-card shadow-card">
            <CardContent className="p-6">
              <h2 className="text-[17px] font-semibold text-foreground">任务目标</h2>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">
                {task.summary ?? "逐步完成以下行动清单。"}
              </p>
              <div className="mt-5 flex items-center gap-3">
                <ProgressBar value={percent} className="flex-1" />
                <span className="font-number text-sm font-medium text-muted-foreground">
                  {doneCount}/{task.steps.length}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 行动清单 */}
          <Card className="rounded-2xl bg-card shadow-card">
            <CardHeader>
              <CardTitle className="text-[17px] font-semibold text-foreground">行动清单</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {task.steps.map((s: TaskStep) => {
                const open = expandedStep === s.id;
                const status = stepStatuses[s.id] ?? s.status;
                return (
                  <div
                    key={s.id}
                    className={cn(
                      "rounded-xl border",
                      status === "done"
                        ? "border-border bg-muted/40"
                        : open
                          ? "border-primary/40 bg-white"
                          : "border-border bg-white",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedStep(open ? null : s.id)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-expanded={open}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "font-number flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                            status === "done" ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary",
                          )}
                        >
                          {status === "done" ? <Check className="size-4" /> : s.position}
                        </span>
                        <div>
                          <p
                            className={cn(
                              "text-[15px] font-medium",
                              status === "done" ? "text-muted-foreground line-through" : "text-foreground",
                            )}
                          >
                            {s.title}
                          </p>
                          {status === "doing" ? <p className="text-xs text-primary">进行中</p> : null}
                        </div>
                      </div>
                      {s.estimatedMinutes ? (
                        <span className="text-xs text-muted-foreground">约 {s.estimatedMinutes} 分钟</span>
                      ) : null}
                    </button>

                    {open ? (
                      <div className="border-t border-border px-4 py-4">
                        {s.description ? (
                          <p className="text-sm leading-relaxed text-muted-foreground">{s.description}</p>
                        ) : null}
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          {status !== "done" ? (
                            <Button size="sm" className="gap-1.5 rounded-xl" onClick={() => completeStep(s.id)}>
                              <Check className="size-4" aria-hidden />
                              完成这一步
                            </Button>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                              <Check className="size-4" aria-hidden />
                              已完成
                            </span>
                          )}
                          {s.officialEntry ? (
                            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                              <ExternalLink className="size-4" aria-hidden />
                              {s.officialEntry}
                            </span>
                          ) : null}
                        </div>
                        <textarea
                          placeholder="备注：例如核验到的费率信息…"
                          rows={2}
                          className="mt-4 w-full resize-none rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label="任务备注"
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </section>

        {/* 右：任务资料 */}
        <aside className="space-y-4">
          <Card className="rounded-2xl bg-card shadow-card">
            <CardHeader>
              <CardTitle className="text-[16px] font-semibold text-foreground">任务资料</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {task.materials?.length ? (
                task.materials.map((m) => (
                  <Badge key={m} variant="secondary" className="rounded-full">
                    {m}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">暂无资料（以官方要求为准）。</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl bg-card shadow-card">
            <CardContent className="space-y-3 p-6 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">适用地区</span>
                <span className="font-medium text-foreground">{task.region ?? "待确认"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">最后核验时间</span>
                <span className="font-number font-medium text-foreground">{task.lastVerifiedAt ?? task.updatedAt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">来源状态</span>
                <SourceBadge type={task.sourceValid ? "official" : "unknown"} />
              </div>
            </CardContent>
          </Card>

          <RiskNotice text="隐私设置：你的任务信息仅自己可见，可随时删除。" tone="info" />
        </aside>
      </div>

      {/* 相似经验（Mock，阶段 6 前保持静态） */}
      <section className="mt-8">
        <div className="flex items-center gap-2.5">
          <h2 className="section-title text-foreground">和你情况相近的真实经验</h2>
          <SourceBadge type="personal" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">个人经历仅供参考，规则与费用可能已变化。</p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {MOCK_PEER_EXPERIENCES.map((pe) => (
            <Card key={pe.id} className="rounded-2xl bg-card shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="rounded-full bg-warning-soft text-warning">
                    个人经验
                  </Badge>
                  <span className="text-xs text-muted-foreground">{pe.date}</span>
                </div>
                <dl className="mt-4 space-y-2 text-sm">
                  {[
                    ["身份", pe.scope],
                    ["地区", pe.region],
                    ["用途", pe.purpose],
                    ["实际耗时", pe.duration],
                    ["材料", pe.materials.join("、")],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3">
                      <dt className="shrink-0 text-muted-foreground">{k}</dt>
                      <dd className="text-right font-medium text-foreground">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-4 rounded-xl bg-warning-soft/70 px-4 py-3">
                  <p className="text-xs font-medium text-warning">踩坑点</p>
                  <ul className="mt-1.5 space-y-1.5">
                    {pe.pitfalls.map((p) => (
                      <li key={p} className="flex items-start gap-2 text-sm leading-relaxed text-foreground">
                        <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 分享经历 */}
      <Card className="mt-6 rounded-2xl bg-card shadow-card">
        <CardContent className="p-6">
          <h3 className="text-[16px] font-semibold text-foreground">完成以后，也可以说说你的经历</h3>
          <p className="mt-1 text-sm text-muted-foreground">发布前可修改确认，不会自动公开你的信息。</p>
          <div className="mt-4 flex flex-wrap items-start gap-3">
            <textarea
              placeholder="例如：我在办理时发现……"
              rows={2}
              className="min-w-[260px] flex-1 resize-none rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="分享你的经历"
            />
            <Button className="rounded-xl">AI 帮我整理</Button>
          </div>
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Flag className="size-3.5" aria-hidden />
            报告过时信息
          </button>
        </CardContent>
      </Card>
    </AppShell>
  );
}
