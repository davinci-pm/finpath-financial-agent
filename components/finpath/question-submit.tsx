"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AIQuestionInput } from "@/components/finpath/ai-question-input";
import { createDiagnosis } from "@/lib/api-client";

/**
 * P01 问题提交桥接：发送问题 → POST /api/diagnosis（场景识别）→ 进入澄清会话。
 */
export function QuestionSubmit() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="block">
      <AIQuestionInput
        loading={submitting}
        onSubmit={async (question) => {
          setSubmitting(true);
          setError(null);
          try {
            const { session } = await createDiagnosis(question);
            router.push(`/diagnosis/${session.id}`);
          } catch (e) {
            setError(e instanceof Error ? e.message : "无法开始诊断，请稍后重试");
            setSubmitting(false);
          }
        }}
      />
      {error ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </span>
  );
}
