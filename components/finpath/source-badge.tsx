import type { SourceType } from "@/lib/types";
import { cn } from "@/lib/utils";

const SOURCE_META: Record<SourceType, { label: string; className: string }> = {
  official: { label: "官方信息", className: "bg-primary-soft text-primary" },
  platform: { label: "平台解释", className: "bg-secondary text-foreground" },
  personal: { label: "个人经验", className: "bg-warning-soft text-warning" },
  file: { label: "文件原文", className: "bg-primary-soft text-primary" },
  ai: { label: "AI 推断", className: "bg-warning-soft text-warning" },
  unknown: { label: "未识别", className: "bg-muted text-muted-foreground" },
};

export type SourceBadgeProps = {
  type: SourceType;
  className?: string;
};

/** 来源标签：官方信息 / 平台解释 / 个人经验 / 文件原文 / AI 推断 / 未识别 */
export function SourceBadge({ type, className }: SourceBadgeProps) {
  const meta = SOURCE_META[type];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        meta.className,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}
