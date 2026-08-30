import Link from "next/link";
import { ArrowRight, Landmark, PiggyBank, Sprout, Waves } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AppShell } from "@/components/layout/app-shell";

const TOPICS = [
  {
    slug: "treasury-bonds",
    title: "第一次买国债",
    desc: "期限、流动性、利率与价格，12 分钟入门。",
    icon: Landmark,
    minutes: 12,
  },
  {
    slug: "emergency-fund",
    title: "应急储备",
    desc: "为什么建议准备 3～6 个月生活开支。",
    icon: PiggyBank,
    minutes: 8,
  },
  {
    slug: "fund-basics",
    title: "基金定投入门",
    desc: "波动、费率与定投，先模拟再决定。",
    icon: Waves,
    minutes: 15,
  },
  {
    slug: "gold-basics",
    title: "黄金与分散配置",
    desc: "黄金在资产组合里的作用与局限。",
    icon: Sprout,
    minutes: 10,
  },
] as const;

/** 学习中心：一页一个知识点和一个问题，学习与模拟，不连接真实交易 */
export default function LearnIndexPage() {
  return (
    <AppShell
      title="学习"
      description="用情景卡和判断题理解一个金融概念，学习与模拟，不连接真实交易。"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {TOPICS.map((t) => {
          const Icon = t.icon;
          return (
            <Link key={t.slug} href={`/learn/${t.slug}`} className="group outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl">
              <Card className="h-full rounded-2xl bg-card shadow-card transition-colors group-hover:bg-primary-soft/40">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="font-number text-sm text-muted-foreground">{t.minutes} 分钟</span>
                  </div>
                  <h3 className="mt-4 text-[17px] font-semibold text-foreground">{t.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t.desc}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    开始学习
                    <ArrowRight className="size-4" aria-hidden />
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
