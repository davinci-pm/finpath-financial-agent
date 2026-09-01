import { cn } from "@/lib/utils";
import { Sidebar } from "./sidebar";
import { PageHeader, type PageHeaderProps } from "./page-header";

export type AppShellProps = {
  children: React.ReactNode;
  /** 页面主标题（一页只突出一个主要任务） */
  title?: React.ReactNode;
  /** 副标题，16—17px 辅助文字 */
  description?: React.ReactNode;
  /** 右上角操作区（按钮等） */
  actions?: PageHeaderProps["actions"];
  /** 主内容最大宽度，默认 1200px */
  maxWidth?: string;
  className?: string;
};

/**
 * 登录后统一应用框架：左侧 220px 侧栏 + 主内容区。
 * 侧栏顺序固定：首页 / 问 AI / 资金地图 / 学习 / 我的任务。
 */
export function AppShell({
  children,
  title,
  description,
  actions,
  maxWidth = "1200px",
  className,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-background pb-20 text-foreground md:pb-0">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <div
          className="mx-auto w-full flex-1 px-6 py-8 md:px-8"
          style={{ maxWidth }}
        >
          {title || description ? (
            <PageHeader title={title} description={description} actions={actions} />
          ) : null}
          <div className={cn("page-enter mt-6", className)}>{children}</div>
        </div>
      </main>
    </div>
  );
}
