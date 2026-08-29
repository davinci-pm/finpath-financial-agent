import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AppShell } from "@/components/layout/app-shell";

export type PlaceholderPageProps = {
  /** 页面标题（对应原型页面） */
  title: string;
  description: string;
  /** 对应原型编号，如 P02 */
  prototypeId?: string;
  /** 路由路径示例 */
  route: string;
};

/** 阶段 1 路由占位页：保证 11 条路由不返回 404，阶段 2 按原型替换 */
export function PlaceholderPage({
  title,
  description,
  prototypeId,
  route,
}: PlaceholderPageProps) {
  return (
    <AppShell title={title} description={description}>
      <Card className="rounded-2xl bg-card shadow-card">
        <CardContent className="flex flex-col items-start gap-4 p-8">
          <div className="flex items-center gap-2">
            {prototypeId ? (
              <Badge variant="secondary" className="rounded-full">
                {prototypeId}
              </Badge>
            ) : null}
            <Badge variant="outline" className="rounded-full">
              阶段 1 占位
            </Badge>
          </div>
          <div>
            <p className="text-[17px] font-medium text-foreground">
              路由 <code className="rounded-md bg-muted px-1.5 py-0.5 font-number text-sm">{route}</code>{" "}
              已注册，可正常访问。
            </p>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              该页面将在阶段 2 依据原型图实现完整 UI 与 Mock 数据，不阻塞两条核心闭环。
            </p>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
