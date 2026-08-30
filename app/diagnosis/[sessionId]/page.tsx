"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Pencil, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClarificationCard } from "@/components/finpath/clarification-card";
import { ErrorState } from "@/components/finpath/error-state";
import { SkeletonState } from "@/components/finpath/skeleton-state";
import {
  answerDiagnosis,
  fetchDiagnosis,
  generatePlan,
} from "@/lib/api-client";
import type { ClarificationQuestion, DiagnosisRecord } from "@/lib/types";

const formatAmount = (min?: string, max?: string) => {
  if (min && max) return `约 ¥${Number(min).toLocaleString("zh-CN")} ～ ¥${Number(max).toLocaleString("zh-CN")}`;
  if (min) return `约 ¥${Number(min).toLocaleString("zh-CN")}`;
  return "待确认";
};

/**
 * P02 AI 澄清与条件确认页（AI 诊断链路）
 * 数据来自 /api/diagnosis/:id；一次只问一个问题；完成后自动生成行动路径。
 */
export default function DiagnosisPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const router = useRouter();
  const [session, setSession] = useState<DiagnosisRecord | null>(null);
  const [question, setQuestion] = useState<ClarificationQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDiagnosis(sessionId);
      setSession(data.session);
      setQuestion(data.question);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchDiagnosis(sessionId);
        if (cancelled) return;
        setSession(data.session);
        setQuestion(data.question);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "加载失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const goGenerate = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const { plan } = await generatePlan(sessionId);
      router.push(`/plans/${plan.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "计划生成失败，请重试");
      setSubmitting(false);
    }
  };

  const handleAnswer = async (key: string, value: string) => {
    setSubmitting(true);
    setError(null);
    try {
      const data = await answerDiagnosis(sessionId, key, value);
      setSession(data.session);
      setQuestion(data.question);
      if (data.completed) {
        await goGenerate();
        return;
      }
      setSubmitting(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "提交失败，请重试");
      setSubmitting(false);
    }
  };

  if (loading && !session) {
    return (
      <DiagnosisShell
        left={<SkeletonState rows={5} />}
        right={<SkeletonState rows={4} />}
      />
    );
  }
  if (error && !session) {
    return (
      <DiagnosisShell left={<ErrorState description={error} onRetry={reload} />} right={null} />
    );
  }
  if (!session) return null;

  const conditions = [
    {
      label: "金额",
      value: formatAmount(session.answers.amountMin, session.answers.amountMax),
      key: null,
    },
    {
      label: "期限",
      value: session.answers.expectedUseHorizon
        ? HORIZON_LABEL[session.answers.expectedUseHorizon] ?? "已确认"
        : "待确认",
      key: "expectedUseHorizon",
    },
    {
      label: "应急储备",
      value: session.answers.emergencyFundMonths
        ? `约 ${session.answers.emergencyFundMonths} 个月`
        : "待确认",
      key: "emergencyFundMonths",
    },
    {
      label: "可承受波动",
      value: session.answers.lossTolerance
        ? LOSS_LABEL[session.answers.lossTolerance] ?? "已确认"
        : "待确认",
      key: "lossTolerance",
    },
  ];
  const answeredCount =
    Object.keys(session.answers).filter((k) => !["amountMin", "amountMax"].includes(k) && session.answers[k] !== "skipped").length;

  return (
    <DiagnosisShell
      left={
        <>
          {/* 用户问题气泡 */}
          <div className="flex justify-end">
            <div className="max-w-[560px] rounded-2xl rounded-br-md bg-primary px-5 py-3.5 text-[16px] leading-relaxed text-primary-foreground">
              {session.rawQuestion}
            </div>
          </div>

          <p className="text-[15px] text-muted-foreground">
            我先确认几个会影响路径的问题，每个问题都可以跳过。
          </p>

          {question ? (
            <ClarificationCard
              key={question.key}
              question={question}
              initialValue={session.answers[question.key]}
              onAnswer={(v) => handleAnswer(question.key, v)}
              onSkip={() => handleAnswer(question.key, "skipped")}
              submitting={submitting}
            />
          ) : (
            <Card className="rounded-2xl bg-card shadow-card">
              <CardContent className="p-6">
                <p className="text-[16px] text-foreground">条件已确认完毕，可以生成行动路径。</p>
                <Button
                  className="mt-4 gap-1.5 rounded-xl"
                  onClick={goGenerate}
                  disabled={submitting}
                >
                  {submitting ? "生成中…" : "生成我的行动路径"}
                  {!submitting ? <ArrowRight className="size-4" aria-hidden /> : null}
                </Button>
              </CardContent>
            </Card>
          )}

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {/* 底部操作区 */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="size-4" aria-hidden />
                重新开始
              </Link>
            </Button>
            {!question ? (
              <Button
                size="sm"
                className="gap-1.5 rounded-xl"
                onClick={goGenerate}
                disabled={submitting}
              >
                {submitting ? "生成中…" : "生成行动路径"}
              </Button>
            ) : null}
          </div>
          <p className="text-right text-sm text-muted-foreground">
            已确认{" "}
            <span className="font-number font-medium text-foreground">{answeredCount}</span> 项条件
          </p>
        </>
      }
      right={
        <Card className="rounded-2xl bg-card shadow-card lg:sticky lg:top-8">
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
                    {c.key && session.answers[c.key] !== undefined ? (
                      <button
                        type="button"
                        onClick={async () => {
                          const data = await fetchDiagnosis(sessionId, c.key!);
                          setQuestion(data.question);
                        }}
                        className="rounded-md p-1 text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`编辑${c.label}`}
                      >
                        <Pencil className="size-3" aria-hidden />
                      </button>
                    ) : null}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 rounded-xl bg-primary-soft px-3.5 py-2.5 text-xs leading-relaxed text-foreground">
              你可以使用金额区间，信息仅用于生成本次路径。
            </p>
          </CardContent>
        </Card>
      }
    />
  );
}

const HORIZON_LABEL: Record<string, string> = {
  anytime: "随时可能用到",
  within_1y: "3～12 个月",
  "1_to_3y": "1～3 年",
  after_3y: "3 年以上",
};
const LOSS_LABEL: Record<string, string> = {
  none: "不能承受波动",
  small: "小幅波动可接受",
  medium: "明显波动可接受",
};

/** P02 页面框架：顶部简化导航 + 两栏网格 */
function DiagnosisShell({
  left,
  right,
}: {
  left: React.ReactNode;
  right: React.ReactNode | null;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
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
      <main className="mx-auto grid w-full max-w-[1200px] flex-1 grid-cols-1 gap-8 px-8 py-8 lg:grid-cols-[720px_360px]">
        <section className="space-y-5">{left}</section>
        {right ? <aside className="hidden lg:block">{right}</aside> : null}
      </main>
    </div>
  );
}
