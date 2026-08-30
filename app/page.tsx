import Link from "next/link";
import {
  ClipboardCheck,
  FileSearch,
  ShieldCheck,
  Sprout,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QuestionSubmit } from "@/components/finpath/question-submit";
import { SCENARIO_CARDS } from "@/lib/mock-data";

/**
 * P01 首次首页 / AI 金融问题入口（视觉基准页）
 * 输入框 Enter 发送 → 跳转 Mock 澄清会话（阶段 4 接入真实诊断流程）。
 * 参考：FinPath_前端原型图_P01-P11/P01-home.png
 */
export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* 顶部导航（未登录简化框架） */}
      <header className="flex items-center justify-between px-8 py-5">
        <Link
          href="/"
          className="flex items-center gap-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="FinPath"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Wallet className="size-5" aria-hidden />
          </span>
          <span className="text-lg font-bold tracking-tight">FinPath</span>
        </Link>
        <nav
          className="hidden items-center gap-8 text-[15px] text-muted-foreground md:flex"
          aria-label="顶部导航"
        >
          <Link href="/learn" className="hover:text-foreground">如何使用</Link>
          <Link href="/learn" className="hover:text-foreground">金融知识库</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/money-map">进入工作台</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/ask">免费问一问</Link>
          </Button>
        </div>
      </header>

      {/* 首屏主体 */}
      <main className="mx-auto grid w-full max-w-[1200px] flex-1 grid-cols-1 gap-10 px-8 pb-10 pt-6 lg:grid-cols-[58%_42%]">
        {/* 左侧：标题 + 输入 + 场景卡 */}
        <section>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-sm font-medium text-primary">
            把金融知识，变成下一步行动
          </span>
          <h1 className="page-title mt-4 max-w-[560px] text-foreground">
            有什么和钱有关的问题，直接告诉我。
          </h1>
          <p className="mt-3 max-w-[520px] text-[17px] leading-relaxed text-muted-foreground">
            从闲钱安排、看懂产品，到办卡换汇，AI
            帮你理清条件、比较路径、列出下一步。
          </p>

          {/* AI 输入卡（Enter 发送，空输入不可提交） */}
          <QuestionSubmit />

          {/* 四张快捷场景卡 */}
          <div className="mt-5 grid grid-cols-2 gap-3.5">
            {SCENARIO_CARDS.map((s) => {
              const iconMap = {
                "钱该怎么安排": Wallet,
                "产品帮我看懂": FileSearch,
                "投资怎么开始": Sprout,
                "金融业务怎么办": ClipboardCheck,
              } as const;
              const Icon = iconMap[s.title as keyof typeof iconMap];
              return (
                <Link key={s.title} href={s.href} className="group outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl">
                  <Card className="h-full rounded-2xl bg-card p-4 shadow-card transition-colors group-hover:bg-primary-soft/50">
                    <CardContent className="flex items-start gap-3 p-0">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                        <Icon className="size-5" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-[15px] font-semibold text-foreground">
                          {s.title}
                        </h3>
                        <p className="mt-1 text-sm leading-snug text-muted-foreground">
                          {s.desc}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 右侧：行动路径预览卡 */}
        <section className="hidden lg:block">
          <Card className="rounded-2xl bg-card shadow-card">
            <CardContent className="p-7">
              <h2 className="section-title text-foreground">行动路径预览</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                不问收益，先问你的用途、期限和风险承受能力，再把一个模糊问题变成一步步可执行清单。
              </p>
              <ol className="mt-6 space-y-5">
                {[
                  { step: "01", title: "先确认用途", desc: "这笔钱什么时候用、准备做什么" },
                  { step: "02", title: "比较可选路径", desc: "流动性、费用、风险，逐一对照" },
                  { step: "03", title: "生成行动清单", desc: "每一步都能执行、可保存、可持续" },
                ].map((s) => (
                  <li key={s.step} className="flex gap-4">
                    <span className="font-number text-lg font-bold text-primary">
                      {s.step}
                    </span>
                    <div>
                      <h3 className="text-[15px] font-semibold text-foreground">
                        {s.title}
                      </h3>
                      <p className="mt-0.5 text-sm text-muted-foreground">{s.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* 底部信任说明 */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-x-10 gap-y-2 px-8 py-5">
          {["结果附来源与更新时间", "不收集银行卡密码", "先看懂，再决定"].map((t) => (
            <span
              key={t}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <ShieldCheck className="size-4 text-primary" aria-hidden />
              {t}
            </span>
          ))}
        </div>
      </footer>
    </div>
  );
}
