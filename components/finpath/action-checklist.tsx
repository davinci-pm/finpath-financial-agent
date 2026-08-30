"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type ActionChecklistProps = {
  items: Array<{ id: string; title: string; done: boolean }>;
};

/** P03 可勾选的下一步行动清单 */
export function ActionChecklist({ items }: ActionChecklistProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(items.map((i) => [i.id, i.done])),
  );

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => setChecked((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 text-left outline-none transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
            aria-pressed={checked[item.id]}
          >
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-md border",
                checked[item.id]
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-white",
              )}
              aria-hidden
            >
              {checked[item.id] ? <Check className="size-3.5" /> : null}
            </span>
            <span
              className={cn(
                "text-[15px]",
                checked[item.id] ? "text-muted-foreground line-through" : "text-foreground",
              )}
            >
              {item.title}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
