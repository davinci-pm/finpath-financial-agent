import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type SkeletonStateProps = {
  /** 骨架行数 */
  rows?: number;
  className?: string;
};

/** Loading / Skeleton 状态（手册 §6.4），用于数据或 AI 生成中的占位 */
export function SkeletonState({ rows = 3, className }: SkeletonStateProps) {
  return (
    <Card className={cn("bg-card", className)} aria-busy="true" aria-label="加载中">
      <CardContent className="space-y-4 py-6">
        <Skeleton className="h-5 w-1/2" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
