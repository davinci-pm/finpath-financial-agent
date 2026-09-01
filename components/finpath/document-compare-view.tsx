"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { AlertTriangle, ArrowRight, Check, FileDiff, FileText } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DocumentRecord } from "@/lib/api-client";

type CompareResult = {
  left: { id: string; fileName: string };
  right: { id: string; fileName: string };
  rows: Array<{ key: string; label: string; left: string; right: string; different: boolean }>;
  warnings: string[];
};

export function DocumentCompareView() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");
  const [result, setResult] = useState<CompareResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    fetch("/api/documents")
      .then(async (response) => {
        const body = await response.json() as { documents?: DocumentRecord[]; error?: string };
        if (!response.ok) throw new Error(body.error ?? "文档加载失败");
        const ready = (body.documents ?? []).filter((item) => item.status === "ready");
        setDocuments(ready);
        setLeftId(ready[0]?.id ?? "");
        setRightId(ready[1]?.id ?? "");
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "文档加载失败"));
  }, []);

  const canCompare = Boolean(leftId && rightId && leftId !== rightId);
  const options = useMemo(() => documents.map((item) => (
    <SelectItem key={item.id} value={item.id}>{item.fileName}</SelectItem>
  )), [documents]);

  const compare = () => startTransition(async () => {
    setError(null);
    const response = await fetch("/api/documents/compare", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leftId, rightId }),
    });
    const body = await response.json() as CompareResult & { error?: string };
    if (!response.ok) return setError(body.error ?? "比较失败");
    setResult(body);
  });

  return (
    <AppShell title="产品文档对比" description="不比宣传词，逐项核对期限、风险、费用与退出条件。" actions={<Button asChild variant="outline"><Link href="/documents/new">上传新文档</Link></Button>}>
      <Card className="shadow-card">
        <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_auto_1fr_auto] md:items-end">
          <label className="text-sm font-medium">文档 A<Select value={leftId} onValueChange={(value) => value && setLeftId(value)}><SelectTrigger className="mt-1.5 w-full"><SelectValue placeholder="选择已确认文档" /></SelectTrigger><SelectContent>{options}</SelectContent></Select></label>
          <FileDiff className="mx-auto mb-2 hidden size-5 text-primary md:block" />
          <label className="text-sm font-medium">文档 B<Select value={rightId} onValueChange={(value) => value && setRightId(value)}><SelectTrigger className="mt-1.5 w-full"><SelectValue placeholder="选择已确认文档" /></SelectTrigger><SelectContent>{options}</SelectContent></Select></label>
          <Button disabled={!canCompare || pending} onClick={compare}>{pending ? "正在比较…" : "开始比较"}</Button>
        </CardContent>
      </Card>

      {error ? <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}
      {!documents.length ? (
        <Card className="mt-5 border-dashed shadow-none"><CardContent className="py-16 text-center"><FileText className="mx-auto size-9 text-muted-foreground" /><h2 className="mt-4 font-semibold">还没有两份已确认的文档</h2><p className="mt-1 text-sm text-muted-foreground">上传并确认识别字段后，就能进行可靠对比。</p><Button asChild className="mt-5"><Link href="/documents/new">上传第一份文档 <ArrowRight className="size-4" /></Link></Button></CardContent></Card>
      ) : null}

      {result ? (
        <Card className="page-enter mt-5 overflow-hidden shadow-card">
          <CardHeader><div className="flex items-center justify-between"><CardTitle>字段核对结果</CardTitle><Badge variant="secondary"><Check className="size-3" />{result.rows.filter((row) => row.different).length} 项差异</Badge></div></CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-[120px_1fr_1fr] border-y bg-muted/50 px-5 py-3 text-xs font-medium text-muted-foreground"><span>比较项</span><span className="truncate px-3">{result.left.fileName}</span><span className="truncate px-3">{result.right.fileName}</span></div>
            {result.rows.map((row) => <div key={row.key} className={`grid grid-cols-[120px_1fr_1fr] px-5 py-3.5 text-sm ${row.different ? "bg-warning-soft/45" : "border-b border-border"}`}><span className="font-medium">{row.label}</span><span className="px-3">{row.left}</span><span className="px-3">{row.right}</span></div>)}
            <div className="m-5 space-y-2 rounded-xl bg-warning-soft p-4">{result.warnings.map((warning) => <p key={warning} className="flex gap-2 text-sm"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />{warning}</p>)}</div>
          </CardContent>
        </Card>
      ) : null}
    </AppShell>
  );
}
