export type PageHeaderProps = {
  /** 主标题 36—40px（页面只突出一个主要任务） */
  title?: React.ReactNode;
  /** 副标题 16—17px 辅助文字 */
  description?: React.ReactNode;
  /** 右上角操作区 */
  actions?: React.ReactNode;
};

/** 页面头部：主标题 + 副标题 + 操作区 */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  if (!title && !description && !actions) return null;

  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-[720px]">
        {title ? (
          <h1 className="page-title text-foreground">{title}</h1>
        ) : null}
        {description ? (
          <p className="mt-2 text-[17px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </header>
  );
}
