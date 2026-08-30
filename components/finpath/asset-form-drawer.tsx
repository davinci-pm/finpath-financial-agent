"use client";

import { useMemo, useState } from "react";
import { Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  ASSET_CATEGORIES,
  GOAL_CATEGORIES,
  LIABILITY_CATEGORIES,
} from "@/lib/mock-data";
import type { AssetKind } from "@/lib/types";

export type AssetFormDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 保存回调（阶段 3 已接入 POST /api/assets） */
  onSave?: (data: {
    kind: AssetKind;
    category: string;
    label: string;
    amountMin?: number;
    amountMax?: number;
    amountExact?: number;
    purpose?: string;
    maturityDate?: string;
    liquidity?: string;
    note?: string;
  }) => void;
};

const KIND_TABS: Array<{ value: AssetKind; label: string }> = [
  { value: "asset", label: "资产" },
  { value: "liability", label: "负债" },
  { value: "goal", label: "目标" },
];

/**
 * P09 添加/编辑资产、负债与目标抽屉。
 * 从 P08 打开：背景变暗 + 右侧 480px 白色抽屉。
 * 四步：类别 → 金额 → 可选信息 → 保存。不允许填写卡号、密码、验证码。
 */
export function AssetFormDrawer({ open, onOpenChange, onSave }: AssetFormDrawerProps) {
  const [kind, setKind] = useState<AssetKind>("asset");
  const [category, setCategory] = useState<string>("定期存款");
  const [amountMode, setAmountMode] = useState<"exact" | "range">("range");
  const [amountMin, setAmountMin] = useState("20000");
  const [amountMax, setAmountMax] = useState("30000");
  const [amountExact, setAmountExact] = useState("");
  const [purpose, setPurpose] = useState("应急储备");
  const [maturityDate, setMaturityDate] = useState("2026-12");
  const [liquidity, setLiquidity] = useState("到期前不方便使用");
  const [note, setNote] = useState("");

  const categories = useMemo(() => {
    if (kind === "asset") return [...ASSET_CATEGORIES];
    if (kind === "liability") return [...LIABILITY_CATEGORIES];
    return [...GOAL_CATEGORIES];
  }, [kind]);

  const handleSave = () => {
    onSave?.({
      kind,
      category,
      label: category,
      amountExact: amountMode === "exact" && amountExact ? Number(amountExact) : undefined,
      amountMin: amountMode === "range" && amountMin ? Number(amountMin) : undefined,
      amountMax: amountMode === "range" && amountMax ? Number(amountMax) : undefined,
      purpose,
      maturityDate,
      liquidity,
      note: note || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto border-l border-border bg-white p-0 sm:max-w-[480px]"
      >
        <SheetHeader className="border-b border-border px-6 py-5">
          <SheetTitle className="text-[20px] font-semibold text-foreground">
            添加一项{kind === "asset" ? "资产" : kind === "liability" ? "负债" : "目标"}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-6 px-6 py-5">
          {/* 类型切换 */}
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1" role="tablist">
            {KIND_TABS.map((tab) => (
              <button
                key={tab.value}
                role="tab"
                aria-selected={kind === tab.value}
                onClick={() => {
                  setKind(tab.value);
                  setCategory(categories[0]);
                }}
                className={cn(
                  "rounded-lg py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  kind === tab.value ? "bg-white text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 第一步：类别 */}
          <div>
            <Label className="text-sm font-medium text-foreground">
              第一步 · 选择类别
            </Label>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-3.5 py-3 text-left text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    category === c
                      ? "border-primary bg-primary-soft text-foreground"
                      : "border-border bg-white text-foreground hover:border-primary/40",
                  )}
                >
                  {c}
                  {category === c ? (
                    <Check className="size-4 text-primary" aria-hidden />
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          {/* 第二步：金额 */}
          <div>
            <Label className="text-sm font-medium text-foreground">
              第二步 · 填写金额（人民币）
            </Label>
            <div className="mt-2.5 flex gap-2">
              {[
                { value: "exact", label: "精确金额" },
                { value: "range", label: "金额区间" },
              ].map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setAmountMode(m.value as "exact" | "range")}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    amountMode === m.value
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {amountMode === "range" ? (
              <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <Input
                  type="number"
                  value={amountMin}
                  onChange={(e) => setAmountMin(e.target.value)}
                  className="rounded-xl"
                  aria-label="金额下限"
                  inputMode="numeric"
                />
                <span className="text-muted-foreground">～</span>
                <Input
                  type="number"
                  value={amountMax}
                  onChange={(e) => setAmountMax(e.target.value)}
                  className="rounded-xl"
                  aria-label="金额上限"
                  inputMode="numeric"
                />
              </div>
            ) : (
              <Input
                type="number"
                value={amountExact}
                onChange={(e) => setAmountExact(e.target.value)}
                placeholder="例如 25000"
                className="mt-3 rounded-xl"
                aria-label="精确金额"
                inputMode="numeric"
              />
            )}
          </div>

          {/* 第三步：可选信息 */}
          <div>
            <Label className="text-sm font-medium text-foreground">
              第三步 · 可选信息
            </Label>
            <div className="mt-2.5 space-y-3">
              <div>
                <Label htmlFor="purpose" className="text-xs text-muted-foreground">
                  用途
                </Label>
                <Input
                  id="purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="例如：应急储备"
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="maturity" className="text-xs text-muted-foreground">
                  到期时间
                </Label>
                <Input
                  id="maturity"
                  value={maturityDate}
                  onChange={(e) => setMaturityDate(e.target.value)}
                  placeholder="例如：2026-12"
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="liquidity" className="text-xs text-muted-foreground">
                  流动性
                </Label>
                <Input
                  id="liquidity"
                  value={liquidity}
                  onChange={(e) => setLiquidity(e.target.value)}
                  placeholder="例如：到期前不方便使用"
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="note" className="text-xs text-muted-foreground">
                  备注
                </Label>
                <Input
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="选填"
                  className="mt-1 rounded-xl"
                />
              </div>
            </div>
          </div>

          <p className="flex items-start gap-2 rounded-xl bg-primary-soft px-3.5 py-2.5 text-xs leading-relaxed text-foreground">
            <Lock className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
            无需填写银行卡号、账户密码或验证码。
          </p>
        </div>

        <div className="sticky bottom-0 flex gap-3 border-t border-border bg-white px-6 py-4">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button className="flex-1 rounded-xl" onClick={handleSave}>
            保存到资金地图
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
