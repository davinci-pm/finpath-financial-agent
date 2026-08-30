import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export type ConclusionCardProps = {
  conclusion: string;
  summary: string;
  applicableConditions: string[];
  updatedAt: string;
};

/** P03 结论卡：浅青绿背景，结论先行，附适用条件与更新时间 */
export function ConclusionCard({
  conclusion,
  summary,
  applicableConditions,
  updatedAt,
}: ConclusionCardProps) {
  return (
    <Card className="rounded-2xl border-none bg-primary-soft shadow-card">
      <CardContent className="p-7">
        <h2 className="text-[22px] font-bold leading-snug text-foreground">{conclusion}</h2>
        <p className="mt-2 max-w-3xl text-[16px] leading-relaxed text-foreground/85">{summary}</p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">适用条件 {applicableConditions.length} 项</span>
          {applicableConditions.map((c) => (
            <Badge key={c} variant="outline" className="rounded-full bg-white/70 font-normal">
              {c}
            </Badge>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">信息更新于 {updatedAt}</p>
      </CardContent>
    </Card>
  );
}
