"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, CircleAlert, Plus, RotateCcw } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/layout/app-shell";
import { TaskCard } from "@/components/finpath/task-card";
import { SkeletonState } from "@/components/finpath/skeleton-state";
import { ErrorState } from "@/components/finpath/error-state";
import { cn } from "@/lib/utils";
import { fetchTasks } from "@/lib/api-client";
import type { Task, TaskStatus } from "@/lib/types";

const FILTERS: Array<{ value: TaskStatus | "all"; label: string }> = [
  { value: "in_progress", label: "进行中" },
  { value: "pending", label: "待处理" },
  { value: "completed", label: "已完成" },
];

/**
 * P10 我的金融任务中心
 * 数据来自 GET /api/tasks（无 Supabase 时 DemoRepository 回退）；
 * 状态筛选为本地状态，不刷新整页。
 */
export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TaskStatus | "all">("in_progress");

  const reload = useCallback(async () => {
    try {
      setTasks(await fetchTasks());
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchTasks();
        if (!cancelled) setTasks(data);
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

  const counts = {
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    pending: tasks.filter((t) => t.status === "pending").length,
    completed: tasks.filter((t) => t.status === "completed").length,
  };

  const visible =
    filter === "all" ? tasks : tasks.filter((t) => t.status === filter);
  const completed = tasks.filter((t) => t.status === "completed");
  const ringData = [{ value: 2 }, { value: 5 }];

  return (
    <AppShell
      title="我的金融任务"
      description="把复杂问题，变成一个个能完成的下一步。"
      actions={
        <Button className="gap-1.5 rounded-xl" asChild>
          <Link href="/ask">
            <Plus className="size-4" aria-hidden />
            新建金融任务
          </Link>
        </Button>
      }
    >
      {loading && tasks.length === 0 ? (
        <SkeletonState rows={4} className="mt-6" />
      ) : error && tasks.length === 0 ? (
        <ErrorState description={error} onRetry={reload} className="mt-6" />
      ) : (
        <>
          {/* 状态筛选 */}
          <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="任务状态筛选">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                role="tab"
                aria-selected={filter === f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  filter === f.value
                    ? "border-primary bg-primary-soft text-foreground"
                    : "border-border bg-white text-muted-foreground hover:border-primary/40",
                )}
              >
                {f.label} {counts[f.value as TaskStatus]}
              </button>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[780px_1fr]">
            {/* 任务列表 */}
            <section className="space-y-4" aria-label="任务列表">
              {visible.map((t, i) => (
                <TaskCard key={t.id} task={t} primary={i === 0 && t.status === "in_progress"} />
              ))}
              {visible.length === 0 ? (
                <Card className="rounded-2xl bg-card shadow-card">
                  <CardContent className="py-10 text-center">
                    <p className="text-[15px] text-muted-foreground">当前筛选下没有任务。</p>
                  </CardContent>
                </Card>
              ) : null}
            </section>

            {/* 本月进展摘要 */}
            <aside className="space-y-4">
              <Card className="rounded-2xl bg-card shadow-card">
                <CardHeader>
                  <CardTitle className="text-[17px] font-semibold text-foreground">本月进展</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { icon: CheckCircle2, text: `完成 ${counts.completed} 项任务` },
                    { icon: BookOpen, text: "学习 3 张知识卡" },
                    { icon: CircleAlert, text: "1 条信息需要更新" },
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <p key={m.text} className="flex items-center gap-2.5 text-sm text-foreground">
                        <Icon className="size-4 text-primary" aria-hidden />
                        {m.text}
                      </p>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="rounded-2xl bg-card shadow-card">
                <CardContent className="flex items-center gap-5 p-6">
                  <div className="relative size-20 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={ringData}
                          dataKey="value"
                          innerRadius={26}
                          outerRadius={38}
                          startAngle={90}
                          endAngle={-270}
                          strokeWidth={0}
                        >
                          <Cell fill="#276B5D" />
                          <Cell fill="#E7F2EE" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <span className="font-number absolute inset-0 flex items-center justify-center text-sm font-bold text-foreground">
                      29%
                    </span>
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-foreground">继续上次任务</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {inProgressTaskTitle(tasks)} · 进行中
                    </p>
                    <Button size="sm" variant="outline" className="mt-3 gap-1.5 rounded-xl" asChild>
                      <Link href={inProgressTaskHref(tasks)}>
                        继续
                        <ArrowRight className="size-4" aria-hidden />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>

          {/* 已完成任务折叠预览 */}
          {completed.length > 0 ? (
            <Card className="mt-6 rounded-2xl bg-card shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-[16px] font-semibold text-foreground">已完成</h2>
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <RotateCcw className="size-4" aria-hidden />
                    {completed.length} 项
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2.5">
                  {completed.map((t) => (
                    <Link
                      key={t.id}
                      href={`/tasks/${t.id}`}
                      className="rounded-full border border-border bg-white px-3.5 py-1.5 text-sm text-muted-foreground outline-none transition-colors hover:border-primary/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {t.title}
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </AppShell>
  );
}

function inProgressTaskTitle(tasks: Task[]): string {
  return tasks.find((t) => t.status === "in_progress")?.title ?? "暂无进行中任务";
}

function inProgressTaskHref(tasks: Task[]): string {
  return tasks.find((t) => t.status === "in_progress")
    ? `/tasks/${tasks.find((t) => t.status === "in_progress")!.id}`
    : "/tasks";
}
