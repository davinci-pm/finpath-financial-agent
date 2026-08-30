"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ClarificationQuestion } from "@/lib/types";

export type ClarificationCardProps = {
  question: ClarificationQuestion;
  /** 初始选中值（返回修改时保留答案） */
  initialValue?: string;
  /** 提交答案 */
  onAnswer: (value: string) => void;
  /** 跳过 */
  onSkip?: () => void;
  /** 是否显示"为什么需要问这个"说明 */
  showReason?: boolean;
};

/** P02 渐进式澄清问题卡：一次只展示一个问题 */
export function ClarificationCard({
  question,
  initialValue,
  onAnswer,
  onSkip,
  showReason = true,
}: ClarificationCardProps) {
  const [selected, setSelected] = useState<string | undefined>(initialValue);
  const [reasonOpen, setReasonOpen] = useState(false);

  return (
    <Card className="rounded-2xl bg-card shadow-card">
      <CardContent className="p-6">
        <h2 className="text-[20px] font-semibold leading-snug text-foreground">
          {question.question}
        </h2>

        <div role="radiogroup" aria-label={question.question} className="mt-5 grid gap-3">
          {question.options.map((opt) => {
            const isSelected = selected === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelected(opt.value)}
                className={cn(
                  "flex items-center justify-between rounded-xl border px-4 py-3.5 text-left text-[16px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected
                    ? "border-primary bg-primary-soft text-foreground"
                    : "border-border bg-white text-foreground hover:border-primary/40",
                )}
              >
                <span className="font-medium">{opt.label}</span>
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full border",
                    isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white",
                  )}
                  aria-hidden
                >
                  {isSelected ? <Check className="size-3.5" /> : null}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {showReason ? (
            <button
              type="button"
              onClick={() => setReasonOpen((v) => !v)}
              className="text-muted-foreground underline-offset-4 outline-none hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              为什么需要问这个？
            </button>
          ) : null}
          {question.skippable && onSkip ? (
            <button
              type="button"
              onClick={onSkip}
              className="text-muted-foreground underline-offset-4 outline-none hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              暂不回答
            </button>
          ) : null}
        </div>

        {reasonOpen ? (
          <p className="mt-3 rounded-xl bg-muted px-4 py-3 text-sm leading-relaxed text-muted-foreground">
            {question.reason}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end">
          <Button
            onClick={() => selected && onAnswer(selected)}
            disabled={!selected}
            className="rounded-xl px-6"
          >
            下一步
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
