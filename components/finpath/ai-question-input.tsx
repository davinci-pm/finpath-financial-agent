"use client";

import { useState } from "react";
import { ArrowUp, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type AIQuestionInputProps = {
  /** 输入占位文案 */
  placeholder?: string;
  /** 提交回调（阶段 2 为跳转 Mock 会话） */
  onSubmit?: (question: string) => void;
  /** 附件提示文案 */
  attachmentHint?: string;
  className?: string;
  /** 加载状态（模拟流式反馈） */
  loading?: boolean;
};

/**
 * AI 问题输入框（P01 / P08 顶部复用）。
 * 空输入不可提交；Enter 发送、Shift+Enter 换行。
 */
export function AIQuestionInput({
  placeholder = "例如：我刚发了 3 万元年终奖，还有房贷，应该怎么安排？",
  onSubmit,
  attachmentHint = "上传产品截图或 PDF",
  className,
  loading = false,
}: AIQuestionInputProps) {
  const [value, setValue] = useState("");

  const canSubmit = value.trim().length > 0 && !loading;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit?.(value.trim());
  };

  return (
    <Card className={cn("rounded-2xl bg-card shadow-card", className)}>
      <CardContent className="p-5">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={placeholder}
          rows={3}
          className="w-full resize-none bg-transparent text-[16px] leading-relaxed text-foreground placeholder:text-muted-foreground/70 outline-none"
          aria-label="输入你的金融问题"
        />
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Paperclip className="size-4" aria-hidden />
            {attachmentHint}
          </span>
          <Button
            size="icon"
            className="size-10 rounded-xl"
            onClick={handleSubmit}
            disabled={!canSubmit}
            aria-label="发送问题"
          >
            {loading ? (
              <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" aria-hidden />
            ) : (
              <ArrowUp className="size-5" aria-hidden />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
