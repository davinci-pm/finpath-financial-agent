"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createTask } from "@/lib/api-client";

export type SavePlanTaskProps = React.ComponentProps<typeof Button> & {
  planId: string;
  title: string;
  summary?: string;
  nextAction?: string;
  steps?: Array<{ title: string; description?: string }>;
  children: React.ReactNode;
};

/**
 * P03 保存行动路径 → POST /api/tasks → 跳转 P10 任务中心。
 * 失败时可重试，不阻塞页面。
 */
export function SavePlanTask({
  planId,
  title,
  summary,
  nextAction,
  steps,
  children,
  ...buttonProps
}: SavePlanTaskProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await createTask({
        sourceType: "plan",
        sourceId: planId,
        title,
        summary,
        nextAction,
        steps,
      });
      router.push("/tasks");
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败，请重试");
      setSaving(false);
    }
  };

  return (
    <span className="inline-flex flex-col items-start gap-1.5">
      <Button {...buttonProps} onClick={handleSave} disabled={saving || buttonProps.disabled}>
        {saving ? "保存中…" : children}
      </Button>
      {error ? (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      ) : null}
    </span>
  );
}
