"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Pencil, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClarificationCard } from "@/components/finpath/clarification-card";
import { MOCK_QUESTIONS, MOCK_SESSION } from "@/lib/mock-data";
import type { DiagnosisSession } from "@/lib/types";

/**
 * P02 AI 澄清与条件确认页（未登录简化框架）
 * 一次只确认一个关键条件；返回修改不丢失答案；右侧实时汇总当前情况。
 * 参考：P02-clarification.png
 */
export default function DiagnosisPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  const session: DiagnosisSession = useMemo(
    () => ({ ...MOCK_SESSION, id: sessionId, rawQuestion: searchParams.get("q") ?? MOCK_SESSION.rawQuestion }),
    [sessionId, searchParams],
  );

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(MOCK_SESSION.answers);
  const question = MOCK_QUESTIONS[Math.min(step, MOCK_QUESTIONS.length - 1)];

  const confirmedCount = useMemo(
    () => Object.values(answers).filter(Boolean).length + 2, // 金额 + 目标固定已确认
    [answers],
  );

  const handleAnswer = (value: string) => {
    setAnswers((prev) => ({ ...prev, [question.key]: value }));
    if (step < MOCK_QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      router.push("/plans/demo-plan");
    }
  };

  const handleSkip = () => {
    if (step < MOCK_QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      router.push("/plans/demo-plan");
    }
  };

  const conditions = [
    { label: "金额", value: "约 ¥30,000" },
    { label: "目标", value: "稳健增值并学习" },
    { label: "期限", value: answers.horizon === "1y_to_3y" ? "1～3 年" : "待确认" },
    { label: "应急储备", value: answers.emergency ? "已确认" : "待确认" },
    { label: "可承受波动", value: answers.loss_tolerance ? "已确认" : "待确认" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* 顶部简化框架 */}
      <header className="flex items-center justify-between border-b border-border px-8 py-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="FinPath"
        >
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Wallet className="size-4" aria-hidden />
          </span>
          <span className="text-base font-bold tracking-tight">FinPath</span>
        </Link>
        <p className="hidden text-sm text-muted-foreground md:block">
          描述问题 <span className="text-border">—</span>{" "}
          <span className="font-medium text-primary">确认条件</span>{" "}
          <span className="text-border">—</span> 获得路径
        </p>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          退出
        </Link>
      </header>

      {/* 主体两栏：左对话区 / 右摘要 */}
      <main className="mx-auto grid w-full max-w-[1200px] flex-1 grid-cols-1 gap-8 px-8 py-8 lg:grid-cols-[720px_360px]">
        <section className="space-y-5">
          {/* 用户问题气泡 */}
          <div className="flex justify-end">
            <div className="max-w-[560px] rounded-2xl rounded-br-md bg-primary px-5 py-3.5 text-[16px] leading-relaxed text-primary-foreground">
              {session.rawQuestion}
            </div>
          </div>

          <p className="text-[15px] text-muted-foreground">
            我先确认几个会影响路径的问题，每个问题都可以跳过。
          </p>

          {/* 当前问题卡 */}
          <ClarificationCard
            key={question.key}
            question={question}
            initialValue={answers[question.key]}
            onAnswer={handleAnswer}
            onSkip={handleSkip}
          />

          {/* 底部操作区 */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="gap-1.5"
            >
              <ArrowLeft className="size-4" aria-hidden />
              返回
            </Button>
            <Button size="sm" className="gap-1.5 rounded-xl" onClick={() => router.push("/plans/demo-plan")}>
              生成我的行动路径
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </div>
          <p className="text-right text-sm text-muted-foreground">
            已确认 <span className="font-number font-medium text-foreground">{confirmedCount}</span> 项条件
          </p>
        </section>

        {/* 右侧当前情况摘要 */}
        <aside>
          <Card className="rounded-2xl bg-card shadow-card">
            <CardContent className="p-6">
              <h2 className="text-[17px] font-semibold text-foreground">当前情况</h2>
              <dl className="mt-4 space-y-4">
                {conditions.map((c) => (
                  <div key={c.label} className="flex items-start justify-between gap-3">
                    <dt className="text-sm text-muted-foreground">{c.label}</dt>
                    <dd className="flex items-center gap-1.5 text-right">
                      <span
                        className={
                          c.value === "待确认"
                            ? "text-sm text-muted-foreground"
                            : "text-sm font-medium text-foreground"
                        }
                      >
                        {c.value}
                      </span>
                      <button
                        type="button"
                        className="rounded-md p-1 text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`编辑${c.label}`}
                      >
                        <Pencil className="size-3" aria-hidden />
                      </button>
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-5 rounded-xl bg-primary-soft px-3.5 py-2.5 text-xs leading-relaxed text-foreground">
                你可以使用金额区间，信息仅用于生成本次路径。
              </p>
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  );
}
