import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressBar } from "@/components/finpath/progress-bar";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";

export type TaskCardProps = {
  task: Task;
  /** 是否为主要任务（P10 第一张高亮） */
  primary?: boolean;
};

const STATUS_LABEL: Record<Task["status"], string> = {
  in_progress: "进行中",
  pending: "待处理",
  completed: "已完成",
};

/** P10 任务卡：进度、下一步、更新时间与继续入口 */
export function TaskCard({ task, primary = false }: TaskCardProps) {
  const percent =
    task.progressTotal > 0
      ? Math.round((task.progressCurrent / task.progressTotal) * 100)
      : task.status === "completed"
        ? 100
        : 0;

  return (
    <Card
      className={cn(
        "rounded-2xl bg-card shadow-card transition-colors",
        primary ? "ring-2 ring-primary/50" : "",
      )}
    >
      <CardContent className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Badge
              variant="secondary"
              className={cn(
                "rounded-full",
                task.status === "in_progress" && "bg-primary-soft text-primary",
                task.status === "pending" && "bg-warning-soft text-warning",
                task.status === "completed" && "bg-muted text-muted-foreground",
              )}
            >
              {STATUS_LABEL[task.status]}
            </Badge>
            {!task.sourceValid ? (
              <Badge variant="outline" className="rounded-full text-warning">
                来源待更新
              </Badge>
            ) : null}
          </div>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" aria-hidden />
            {task.updatedAt}
          </span>
        </div>

        <h3 className="mt-3 text-[20px] font-semibold text-foreground">{task.title}</h3>
        {task.summary ? (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{task.summary}</p>
        ) : null}

        <div className="mt-4 flex items-center gap-3">
          <ProgressBar value={percent} className="flex-1" />
          <span className="font-number text-sm font-medium text-muted-foreground">
            {task.progressCurrent}/{task.progressTotal}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[15px] text-foreground">
            下一步：
            <span className="font-medium text-primary">{task.nextAction}</span>
          </p>
          <Button asChild size="sm" className="rounded-xl">
            <Link href={`/tasks/${task.id}`}>
              继续
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
