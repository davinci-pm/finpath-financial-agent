import { cn } from "@/lib/utils";

export type ProgressBarProps = {
  /** 0-100 */
  value: number;
  className?: string;
  /** 是否显示百分比文字 */
  showLabel?: boolean;
};

/** 线性进度条（任务进度 / 目标进度） */
export function ProgressBar({ value, className, showLabel = false }: ProgressBarProps) {
  const safe = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        role="progressbar"
        aria-valuenow={Math.round(safe)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${safe}%` }}
        />
      </div>
      {showLabel ? (
        <span className="font-number text-xs font-medium text-muted-foreground">
          {Math.round(safe)}%
        </span>
      ) : null}
    </div>
  );
}
