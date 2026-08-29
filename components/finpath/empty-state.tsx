import { Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export type EmptyStateProps = {
  /** 空状态标题 */
  title: string;
  /** 引导说明（空状态必须给出下一步，不能只写"暂无数据"） */
  description?: string;
  /** 可选的引导操作 */
  action?: React.ReactNode;
};

/** 空数据状态（手册 §6.4），必须包含下一步引导 */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Card className="bg-card">
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft">
          <Inbox className="size-6 text-primary" aria-hidden />
        </span>
        <div>
          <h3 className="text-[17px] font-semibold text-foreground">{title}</h3>
          {description ? (
            <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="mt-1">{action}</div> : null}
      </CardContent>
    </Card>
  );
}
