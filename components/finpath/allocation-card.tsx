import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PlanBucket } from "@/lib/types";

export type AllocationCardProps = {
  bucket: PlanBucket;
  highlight?: boolean;
};

/** P03 资金桶路径卡：适合情况 / 需要注意 / 下一步了解 */
export function AllocationCard({ bucket, highlight = false }: AllocationCardProps) {
  return (
    <Card
      className={cn(
        "flex flex-col rounded-2xl bg-card shadow-card",
        highlight ? "ring-2 ring-primary/60" : "",
      )}
    >
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between gap-2">
          <Badge
            className={cn(
              "rounded-full font-medium",
              bucket.key === "reserve" ? "bg-warning-soft text-warning" : "bg-primary-soft text-primary",
            )}
          >
            {bucket.tag}
          </Badge>
          <span className="font-number text-[26px] font-bold text-primary">
            {bucket.percentage}%
          </span>
        </div>
        <CardTitle className="mt-3 text-[20px] font-semibold text-foreground">
          {bucket.label}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{bucket.tagline}</p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 pt-4 text-[15px] leading-relaxed">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">适合什么情况</p>
          <p className="mt-0.5 text-foreground">{bucket.suitableFor}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground">需要注意</p>
          <p className="mt-0.5 text-foreground">{bucket.watchOut}</p>
        </div>
        <div className="mt-auto pt-1">
          <p className="text-xs font-semibold text-muted-foreground">下一步了解</p>
          <p className="mt-0.5 font-medium text-primary">{bucket.nextStep}</p>
        </div>
      </CardContent>
    </Card>
  );
}
