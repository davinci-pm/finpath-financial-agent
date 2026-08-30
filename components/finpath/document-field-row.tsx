"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SourceBadge } from "@/components/finpath/source-badge";
import type { DocumentField } from "@/lib/types";

export type DocumentFieldRowProps = {
  field: DocumentField;
  onChange?: (value: string) => void;
};

/** P04 字段确认行：label + 可编辑值 + 来源状态 + 页码/原文/置信度 */
export function DocumentFieldRow({ field, onChange }: DocumentFieldRowProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(field.value);

  return (
    <div className="flex items-start justify-between gap-3 border-b border-border py-3 last:border-b-0">
      <span className="w-[88px] shrink-0 pt-0.5 text-sm text-muted-foreground">{field.label}</span>
      <div className="min-w-0 flex-1">
        {editing ? (
          <Input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              onChange?.(e.target.value);
            }}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditing(false)}
            autoFocus
            className="rounded-lg text-sm"
            aria-label={`编辑${field.label}`}
          />
        ) : (
          <span className="text-[15px] font-medium text-foreground">{value}</span>
        )}
        {(field.page != null || field.snippet) && field.source !== "unknown" ? (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {field.page != null ? `第 ${field.page} 页 · ` : ""}
            {field.confidence != null ? `置信度 ${Math.round(field.confidence * 100)}%` : ""}
            {field.snippet ? (
              <span className="ml-1 text-muted-foreground/80">“{field.snippet}”</span>
            ) : null}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <SourceBadge type={field.source} />
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="rounded-lg p-1.5 text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`修改${field.label}`}
        >
          <Pencil className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
