import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type ErrorStateProps = {
  /** 错误标题 */
  title?: string;
  /** 错误说明 */
  description?: string;
  /** 是否可恢复（允许重试） */
  recoverable?: boolean;
  /** 重试回调 */
  onRetry?: () => void;
  className?: string;
};

/**
 * 可恢复失败状态（手册 §6.4）。
 * AI 输出校验失败、网络失败等统一使用此组件展示。
 */
export function ErrorState({
  title = "出了点问题",
  description = "暂时无法完成操作，请稍后再试。",
  recoverable = true,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <Card className={cn("border-destructive/20 bg-card", className)}>
      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="size-6 text-destructive" aria-hidden />
        </span>
        <div>
          <h3 className="text-[17px] font-semibold text-foreground">{title}</h3>
          <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        {recoverable && onRetry ? (
          <Button variant="outline" onClick={onRetry}>
            重试
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
