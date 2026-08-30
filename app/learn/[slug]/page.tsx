"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/layout/app-shell";
import { cn } from "@/lib/utils";
import { MOCK_LEARN_NODE, MOCK_LEARN_PATH } from "@/lib/mock-data";

type Feedback = { ok: boolean; text: string } | null;

/**
 * P06 投资入门学习路径页
 * 一页一个知识点和一个问题；选择后才允许查看解释；模拟学习不连接真实交易。
 * 参考：P06-learning.png
 */
export default function LearnPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const path = MOCK_LEARN_PATH;
  const node = MOCK_LEARN_NODE;
  const current = path.nodes.find((n) => n.status === "current") ?? path.nodes[0];

  const handleSubmit = () => {
    if (!selected) return;
    const ok = selected === "term_and_liquidity";
    setFeedback({
      ok,
      text: ok
        ? "正确。期限是否与你的用钱时间匹配，决定这笔钱是否适合买这款国债。"
        : "再想想：收益率高不代表适合你。你需要先确认期限与自己的用钱时间是否匹配。",
    });
  };

  return (
    <AppShell
      title={path.title}
      description={path.subtitle}
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[760px_1fr]">
        {/* 左：当前学习节点 */}
        <section>
          <p className="text-sm text-muted-foreground">
            第 <span className="font-number font-medium text-foreground">{node.position}</span> /{" "}
            {node.total} 节
          </p>
          <h2 className="mt-2 text-[24px] font-bold leading-snug text-foreground">
            {node.title}
          </h2>

          <Card className="mt-5 rounded-2xl bg-card shadow-card">
            <CardContent className="p-6">
              <p className="text-[16px] leading-relaxed text-foreground">
                <span className="mr-2 rounded-md bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">
                  情景
                </span>
                {node.scenario}
              </p>

              <h3 className="mt-5 text-[17px] font-semibold text-foreground">{node.question}</h3>
              <div className="mt-3 space-y-3" role="radiogroup" aria-label={node.question}>
                {node.options.map((opt) => {
                  const isSelected = selected === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => {
                        setSelected(opt.value);
                        setFeedback(null);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left text-[15px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                        isSelected
                          ? "border-primary bg-primary-soft text-foreground"
                          : "border-border bg-white text-foreground hover:border-primary/40",
                      )}
                    >
                      {opt.label}
                      <span
                        className={cn(
                          "flex size-5 items-center justify-center rounded-full border",
                          isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border",
                        )}
                        aria-hidden
                      >
                        {isSelected ? <Check className="size-3.5" /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 flex items-center gap-3">
                <Button
                  onClick={handleSubmit}
                  disabled={!selected}
                  className="rounded-xl px-6"
                >
                  提交判断
                </Button>
                {feedback ? (
                  <p
                    role="status"
                    className={cn(
                      "flex items-center gap-2 text-sm",
                      feedback.ok ? "text-primary" : "text-warning",
                    )}
                  >
                    {feedback.ok ? (
                      <Check className="size-4" aria-hidden />
                    ) : (
                      <X className="size-4" aria-hidden />
                    )}
                    {feedback.text}
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 右：路径进度 */}
        <aside>
          <Card className="rounded-2xl bg-card shadow-card">
            <CardHeader>
              <CardTitle className="text-[17px] font-semibold text-foreground">学习路径</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative space-y-1 border-l border-border pl-5">
                {path.nodes.map((n) => (
                  <li key={n.slug} className="relative py-2">
                    <span
                      className={cn(
                        "absolute -left-[27px] flex size-4 items-center justify-center rounded-full border-2",
                        n.status === "done" && "border-primary bg-primary",
                        n.status === "current" && "border-primary bg-white",
                        n.status === "todo" && "border-border bg-white",
                      )}
                      aria-hidden
                    >
                      {n.status === "done" ? (
                        <Check className="size-2.5 text-primary-foreground" />
                      ) : null}
                    </span>
                    <p
                      className={cn(
                        "text-[15px]",
                        n.status === "done" && "text-muted-foreground",
                        n.status === "current" && "font-semibold text-foreground",
                        n.status === "todo" && "text-muted-foreground",
                      )}
                    >
                      {n.title}
                    </p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card className="mt-4 rounded-2xl bg-card shadow-card">
            <CardContent className="p-6">
              <h3 className="text-[15px] font-semibold text-foreground">完成后你将学会</h3>
              <ul className="mt-3 space-y-2">
                {path.willLearn.map((w) => (
                  <li key={w} className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                    {w}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">当前节点：{current.title}</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
