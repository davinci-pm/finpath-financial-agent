"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, MessageCircleQuestion, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorState } from "@/components/finpath/error-state";
import { RiskNotice } from "@/components/finpath/risk-notice";
import { SkeletonState } from "@/components/finpath/skeleton-state";
import { SourceBadge } from "@/components/finpath/source-badge";
import {
  createTask,
  fetchDocument,
  generateDocumentReport,
} from "@/lib/api-client";
import type { ProductAnalysis } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * P05 金融产品解读结果页
 * 数据来自确认字段 + 确定性解读模板；不出现购买入口与具体产品导流。
 * 保存到我的任务 → POST /api/tasks → P10。
 */
export default function DocumentPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = use(params);
  const router = useRouter();
  const [report, setReport] = useState<ProductAnalysis | null>(null);
  const [fileName, setFileName] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notConfirmed, setNotConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotConfirmed(false);
    try {
      const { document: doc, extraction } = await fetchDocument(documentId);
      setFileName(doc.fileName);
      if (!extraction || extraction.status !== "confirmed") {
        setNotConfirmed(true);
        return;
      }
      setReport(await generateDocumentReport(documentId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { document: doc, extraction } = await fetchDocument(documentId);
        if (cancelled) return;
        setFileName(doc.fileName);
        if (!extraction || extraction.status !== "confirmed") {
          setNotConfirmed(true);
          setLoading(false);
          return;
        }
        const r = await generateDocumentReport(documentId);
        if (cancelled) return;
        setReport(r);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "加载失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  const handleSaveTask = async () => {
    setSaving(true);
    setError(null);
    try {
      await createTask({
        sourceType: "document",
        sourceId: documentId,
        title: "看懂一份产品文件",
        summary: report?.conclusion ?? "产品解读",
        nextAction: "核验产品合同细节",
        steps: [
          { title: "核验产品合同细节", description: "确认费用与提前退出条款" },
          { title: "决定是否纳入资金地图", description: "确认后写入资产档案" },
        ],
      });
      router.push("/tasks");
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败，请重试");
      setSaving(false);
    }
  };

  if (loading && !report && !notConfirmed) {
    return (
      <AppShell title="产品解读">
        <SkeletonState rows={6} className="mt-6" />
      </AppShell>
    );
  }

  if (error && !report) {
    return (
      <AppShell title="产品解读">
        <ErrorState description={error} onRetry={reload} className="mt-6" />
      </AppShell>
    );
  }

  if (notConfirmed) {
    return (
      <AppShell
        title="产品解读"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/documents/new">
              <ArrowLeft className="size-4" aria-hidden />
              返回上传
            </Link>
          </Button>
        }
      >
        <Card className="rounded-2xl bg-card shadow-card">
          <CardContent className="p-8">
            <p className="text-[17px] font-medium text-foreground">
              请先在「确认字段」页面完成字段确认，再生成解读。
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              用户确认前不会生成最终产品解读。
            </p>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  if (!report) return null;

  const analysis = report;

  return (
    <AppShell
      actions={
        <>
          <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" asChild>
            <Link href="/documents/new">
              <MessageCircleQuestion className="size-4" aria-hidden />
              继续问 AI
            </Link>
          </Button>
          <Button size="sm" className="gap-1.5 rounded-xl" onClick={handleSaveTask} disabled={saving}>
            <Save className="size-4" aria-hidden />
            {saving ? "保存中…" : "保存到我的任务"}
          </Button>
        </>
      }
    >
      <Link
        href="/documents/new"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" aria-hidden />
        返回重新上传
      </Link>

      {/* 结论主卡 */}
      <Card className="rounded-2xl bg-primary-soft shadow-card">
        <CardContent className="p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-primary">产品解读 · {fileName}</p>
              <h2 className="mt-1 text-[26px] font-bold text-foreground">
                先说结论：{analysis.conclusion}
              </h2>
              <p className="mt-1.5 text-[16px] text-foreground/85">{analysis.productType}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {analysis.markers.map((m) => (
                <Badge
                  key={m.label}
                  className={cn(
                    "rounded-full font-medium",
                    m.tone === "warning" ? "bg-warning-soft text-warning" : "bg-white/80 text-foreground",
                  )}
                >
                  {m.label}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5 件事 + 关键信息 */}
      <section className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
        <Card className="rounded-2xl bg-card shadow-card">
          <CardHeader>
            <CardTitle className="text-[18px] font-semibold text-foreground">
              你最需要看懂的 5 件事
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysis.keyPoints.map((p, i) => (
              <div key={p.title} className="flex gap-4">
                <span className="font-number flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold text-foreground">{p.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="h-fit rounded-2xl bg-card shadow-card">
          <CardHeader>
            <CardTitle className="text-[18px] font-semibold text-foreground">关键信息</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {analysis.keyInfo.map((k) => (
              <div key={k.label} className="flex items-center justify-between gap-3 py-3">
                <span className="shrink-0 text-sm text-muted-foreground">{k.label}</span>
                <div className="flex items-center gap-2 text-right">
                  <span className="text-sm font-medium text-foreground">{k.value}</span>
                  <SourceBadge type={k.source} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* 购买前还要确认 */}
      <section className="mt-6">
        <Card className="rounded-2xl border-warning/30 bg-white shadow-card">
          <CardContent className="p-6">
            <h2 className="text-[18px] font-semibold text-foreground">购买前还要确认</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              以下问题可以直接问销售人员或客服，核验后再决定。
            </p>
            <ul className="mt-4 space-y-2.5">
              {analysis.questionsToAsk.map((q, i) => (
                <li
                  key={q}
                  className="flex items-start gap-3 rounded-xl bg-warning-soft px-4 py-3 text-sm leading-relaxed text-foreground"
                >
                  <span className="font-number mt-0.5 font-bold text-warning">{i + 1}</span>
                  {q}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* 三张路径卡 */}
      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {analysis.comparisons.map((c) => (
          <Card key={c.title} className="rounded-2xl bg-card shadow-card">
            <CardContent className="p-6">
              <h3 className="text-[16px] font-semibold text-foreground">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.text}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* 来源区域 */}
      <section className="mt-6">
        <Card className="rounded-2xl bg-card shadow-card">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[16px] font-semibold text-foreground">信息来源</h2>
              <span className="text-xs text-muted-foreground">更新时间 {analysis.sources[0]?.updatedAt}</span>
            </div>
            <div className="mt-3 space-y-3">
              {analysis.sources.map((s) => (
                <div key={s.id} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.region ? `${s.region} · ` : ""}更新于 {s.updatedAt}
                    </p>
                  </div>
                  <SourceBadge type={s.type} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {error ? (
        <p role="alert" className="text-sm text-destructive">{error}</p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button size="lg" className="gap-1.5 rounded-xl px-7" onClick={handleSaveTask} disabled={saving}>
          {saving ? "保存中…" : "保存到我的任务"}
          {!saving ? <ArrowRight className="size-4" aria-hidden /> : null}
        </Button>
        <RiskNotice text="以上为行动教育建议，不构成具体投资推荐。产品信息请以官方合同与说明书为准。" />
      </div>
    </AppShell>
  );
}
