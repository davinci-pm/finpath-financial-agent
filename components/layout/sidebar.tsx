"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  Gauge,
  GraduationCap,
  Home,
  ListTodo,
  LogOut,
  Map,
  ReceiptText,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/** 统一侧栏顺序：首页、问 AI、资金地图、学习、我的任务（手册 §6.2 / 验收清单 §1） */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "首页", icon: Home },
  { href: "/workspace", label: "决策工作台", icon: Gauge },
  { href: "/cashflow", label: "月度现金流", icon: ReceiptText },
  { href: "/ask", label: "问 AI", icon: Sparkles },
  { href: "/money-map", label: "资金地图", icon: Map },
  { href: "/learn", label: "学习", icon: GraduationCap },
  { href: "/tasks", label: "我的任务", icon: ListTodo },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const links = (mobile = false) => (mobile
    ? NAV_ITEMS.filter((item) => ["/workspace", "/cashflow", "/ask", "/tasks"].includes(item.href))
    : NAV_ITEMS).map((item) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          mobile
            ? "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium"
            : "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] font-medium",
          "outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring",
          active
            ? "bg-primary-soft text-foreground shadow-[inset_3px_0_0_var(--primary)]"
            : "text-muted-foreground hover:translate-x-0.5 hover:bg-muted hover:text-foreground",
        )}
      >
        <Icon
          className={cn(mobile ? "size-4" : "size-[18px]", active ? "text-primary" : "")}
          aria-hidden
        />
        <span className={mobile ? "truncate" : undefined}>{item.label}</span>
      </Link>
    );
  });

  const logout = (mobile = false) => (
    <form action="/api/auth/logout" method="post" className={mobile ? "contents" : undefined}>
      <button
        type="submit"
        className={cn(
          mobile
            ? "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium"
            : "flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] font-medium",
          "text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <LogOut className={mobile ? "size-4" : "size-[18px]"} aria-hidden />
        <span className={mobile ? "truncate" : undefined}>退出</span>
      </button>
    </form>
  );

  return (
    <>
    <aside className="sticky top-0 hidden h-screen w-[220px] shrink-0 flex-col border-r border-border bg-background md:flex">
      {/* Logo */}
      <Link
        href="/"
        className="flex items-center gap-2.5 px-6 pb-6 pt-7 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="FinPath 首页"
      >
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Compass className="size-5" aria-hidden />
        </span>
        <span className="text-lg font-bold tracking-tight text-foreground">
          FinPath
        </span>
      </Link>

      {/* 导航 */}
      <nav className="flex-1 space-y-1 px-3" aria-label="主导航">
        {links()}
      </nav>

      {/* 底部提示 */}
      <div className="space-y-3 px-3 py-6">
        {logout()}
        <p className="text-xs leading-relaxed text-muted-foreground">
          行动教育建议，不构成具体投资推荐
        </p>
      </div>
    </aside>
    <nav
      aria-label="移动主导航"
      className="fixed inset-x-0 bottom-0 z-50 flex border-t border-border bg-background/95 px-2 py-1 backdrop-blur md:hidden"
    >
      {links(true)}
      {logout(true)}
    </nav>
    </>
  );
}
