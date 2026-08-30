import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export type AssetSummaryCardProps = {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "warning";
};

/** P08 指标卡：总资产 / 总负债 / 净资产 / 应急覆盖 */
export function AssetSummaryCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: AssetSummaryCardProps) {
  return (
    <Card className="rounded-2xl bg-card shadow-card">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span
            className={
              tone === "warning"
                ? "flex size-8 items-center justify-center rounded-lg bg-warning-soft text-warning"
                : "flex size-8 items-center justify-center rounded-lg bg-primary-soft text-primary"
            }
          >
            <Icon className="size-4" aria-hidden />
          </span>
        </div>
        <p className="font-number mt-2 text-[24px] font-bold tracking-tight text-foreground">
          {value}
        </p>
        {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
