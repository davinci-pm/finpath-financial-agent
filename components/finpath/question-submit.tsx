"use client";

import { useRouter } from "next/navigation";
import { AIQuestionInput } from "@/components/finpath/ai-question-input";

/**
 * P01 问题提交桥接：发送问题 → 进入 Mock 澄清会话。
 * 阶段 4 将改为 POST /api/diagnosis 创建真实会话。
 */
export function QuestionSubmit() {
  const router = useRouter();

  return (
    <AIQuestionInput
      onSubmit={(question) => {
        router.push(`/diagnosis/demo-session?q=${encodeURIComponent(question)}`);
      }}
    />
  );
}
