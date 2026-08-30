import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { QuestionSubmit } from "@/components/finpath/question-submit";
import { SCENARIO_CARDS } from "@/lib/mock-data";

export const metadata: Metadata = { title: "问 AI" };

/**
 * 问 AI 入口页（侧栏第 2 项）。
 * 登录后版本的提问输入 + 四张场景入口，跳转澄清/上传流程。
 */
export default function AskPage() {
  return (
    <AppShell
      title="问 AI"
      description="把和钱有关的问题直接说出来，AI 帮你理清条件、比较路径、列出下一步。"
    >
      <div className="max-w-3xl">
        <QuestionSubmit />
      </div>
      <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="快捷场景">
        {SCENARIO_CARDS.map((scenario) => (
          <Link key={scenario.title} href={scenario.href} className="group rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Card className="h-full rounded-2xl bg-card shadow-card transition-colors group-hover:bg-primary-soft/40">
              <CardContent className="flex items-center justify-between gap-4 p-5">
                <div>
                  <h2 className="text-[16px] font-semibold text-foreground">{scenario.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{scenario.desc}</p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden />
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </AppShell>
  );
}
