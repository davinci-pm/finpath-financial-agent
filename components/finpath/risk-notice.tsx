import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type RiskNoticeProps = {
  /** 提示内容（不得包含收益承诺） */
  text: string;
  tone?: "warning" | "info";
  className?: string;
};

/** 风险 / 提示条（警示色琥珀 #D7953F） */
export function RiskNotice({ text, tone = "warning", className }: RiskNoticeProps) {
  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm leading-relaxed",
        tone === "warning" ? "bg-warning-soft text-foreground" : "bg-primary-soft text-foreground",
        className,
      )}
    >
      <AlertCircle
        className={cn("mt-0.5 size-4 shrink-0", tone === "warning" ? "text-warning" : "text-primary")}
        aria-hidden
      />
      <span>{text}</span>
    </div>
  );
}
