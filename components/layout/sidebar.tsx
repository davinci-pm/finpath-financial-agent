"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  GraduationCap,
  Home,
  ListTodo,
  Map,
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

  return (
    <aside className="sticky top-0 flex h-screen w-[220px] shrink-0 flex-col border-r border-border bg-background">
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
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-primary-soft text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon
                className={cn("size-[18px]", active ? "text-primary" : "")}
                aria-hidden
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* 底部提示 */}
      <div className="px-6 py-6">
        <p className="text-xs leading-relaxed text-muted-foreground">
          行动教育建议，不构成具体投资推荐
        </p>
      </div>
    </aside>
  );
}
