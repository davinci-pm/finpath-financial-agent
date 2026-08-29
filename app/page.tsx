import Link from "next/link";
import {
  ArrowUp,
  ClipboardCheck,
  FileSearch,
  Paperclip,
  ShieldCheck,
  Sprout,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * P01 首次首页 / AI 金融问题入口（视觉基准页）
 * 阶段 1：静态视觉基准，输入与场景卡交互在阶段 2 接入。
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
        <nav className="hidden items-center gap-8 text-[15px] text-muted-foreground md:flex" aria-label="顶部导航">
          <Link href="/learn" className="hover:text-foreground">如何使用</Link>
          <Link href="/learn" className="hover:text-foreground">金融知识库</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm">登录</Button>
          <Button size="sm">免费问一问</Button>
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

          {/* AI 输入卡 */}
          <Card className="mt-7 rounded-2xl bg-card shadow-card">
            <CardContent className="p-5">
              <textarea
                defaultValue=""
                placeholder="例如：我刚发了 3 万元年终奖，还有房贷，应该怎么安排？"
                rows={3}
                className="w-full resize-none bg-transparent text-[16px] leading-relaxed text-foreground placeholder:text-muted-foreground/70 outline-none"
                aria-label="输入你的金融问题"
              />
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Paperclip className="size-4" aria-hidden />
                  上传产品截图或 PDF
                </span>
                <Button size="icon" className="size-10 rounded-xl" disabled aria-label="发送问题">
                  <ArrowUp className="size-5" aria-hidden />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 四张快捷场景卡 */}
          <div className="mt-5 grid grid-cols-2 gap-3.5">
            {[
              {
                icon: Wallet,
                title: "钱该怎么安排",
                desc: "闲钱、年终奖，先想清楚怎么放",
              },
              {
                icon: FileSearch,
                title: "产品帮我看懂",
                desc: "上传截图或 PDF，先看懂再决定",
              },
              {
                icon: Sprout,
                title: "投资怎么开始",
                desc: "从国债、基金入门，不连真实交易",
              },
              {
                icon: ClipboardCheck,
                title: "金融业务怎么办",
                desc: "办卡、换汇、查征信，按步骤走",
              },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <Card
                  key={s.title}
                  className="cursor-default rounded-2xl bg-card p-4 shadow-card transition-colors hover:bg-primary-soft/50"
                >
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
          {[
            { icon: ShieldCheck, text: "结果附来源与更新时间" },
            { icon: ShieldCheck, text: "不收集银行卡密码" },
            { icon: ShieldCheck, text: "先看懂，再决定" },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <span
                key={t.text}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Icon className="size-4 text-primary" aria-hidden />
                {t.text}
              </span>
            );
          })}
        </div>
      </footer>
    </div>
  );
}
