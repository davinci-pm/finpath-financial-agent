"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/layout/app-shell";
import { DocumentFieldRow } from "@/components/finpath/document-field-row";
import { FileUploader, type UploadPhase } from "@/components/finpath/file-uploader";
import { RiskNotice } from "@/components/finpath/risk-notice";
import {
  analyzeDocument,
  confirmExtraction,
  uploadDocument,
} from "@/lib/api-client";
import type { DocumentField, ExtractionRecord } from "@/lib/types";

/**
 * P04 金融产品上传与识别确认页
 * 真实链路：上传（≤20MB，PDF/PNG/JPG）→ DocumentAnalyzer 提取 → 用户确认 → 生成解读。
 * 参考：P04-document-upload.png
 */
export default function DocumentNewPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [fileName, setFileName] = useState<string>();
  const [docId, setDocId] = useState<string | null>(null);
  const [fields, setFields] = useState<DocumentField[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const reset = useCallback(() => {
    setPhase("idle");
    setFileName(undefined);
    setDocId(null);
    setFields([]);
    setError(null);
  }, []);

  const handleFileSelected = useCallback(
    async (file: File) => {
      setError(null);
      const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
      if (![".pdf", ".png", ".jpg", ".jpeg"].includes(ext)) {
        setPhase("failed");
        setError("仅支持 PDF、PNG、JPG 文件");
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        setPhase("failed");
        setError("文件超过 20MB 限制");
        return;
      }
      try {
        setPhase("uploading");
        setFileName(file.name);
        const doc = await uploadDocument(file);
        setDocId(doc.id);

        setPhase("analyzing");
        const extraction: ExtractionRecord = await analyzeDocument(doc.id);
        setFields(extraction.fields);
        setPhase("done");
      } catch (e) {
        setPhase("failed");
        setError(e instanceof Error ? e.message : "上传或解析失败");
      }
    },
    [],
  );

  const handleConfirm = async () => {
    if (!docId) return;
    setConfirming(true);
    setError(null);
    try {
      const confirmed = Object.fromEntries(fields.map((f) => [f.key, f.value]));
      await confirmExtraction(docId, confirmed);
      router.push(`/documents/${docId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "确认失败，请重试");
      setConfirming(false);
    }
  };

  const done = phase === "done";
  const busy = phase === "uploading" || phase === "analyzing";

  return (
    <AppShell
      title="一个产品，先帮你看懂"
      description="上传截图或 PDF，我会先提取关键信息，再由你确认。"
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* 左：上传区 */}
        <section>
          <FileUploader
            onFileSelected={handleFileSelected}
            phase={phase}
            fileName={fileName}
            error={error ?? undefined}
            onReset={reset}
          />

          <RiskNotice
            tone="info"
            text="上传文件仅用于本次识别，可随时删除。请勿上传包含银行卡号、密码或身份证照片的文件。"
            className="mt-5"
          />
        </section>

        {/* 右：识别结果预览 */}
        <section>
          <Card className="rounded-2xl bg-card shadow-card">
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-[17px] font-semibold text-foreground">
                  {done ? fileName : "识别结果预览"}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {done
                    ? "识别完成，等待确认"
                    : busy
                      ? "正在识别文件，请稍候…"
                      : "上传文件后开始识别"}
                </p>
              </div>
              {done ? (
                <CheckCircle2 className="size-6 shrink-0 text-primary" aria-hidden />
              ) : busy ? (
                <Loader2 className="size-6 shrink-0 animate-spin text-primary" aria-hidden />
              ) : null}
            </CardHeader>
            <CardContent>
              {done ? (
                <>
                  <div className="divide-y divide-border">
                    {fields.map((f) => (
                      <DocumentFieldRow
                        key={f.key}
                        field={f}
                        onChange={(value) =>
                          setFields((current) =>
                            current.map((field) =>
                              field.key === f.key ? { ...field, value } : field,
                            ),
                          )
                        }
                      />
                    ))}
                  </div>
                  {error ? (
                    <p role="alert" className="mt-4 text-sm text-destructive">
                      {error}
                    </p>
                  ) : null}
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button
                      className="flex-1 rounded-xl"
                      onClick={handleConfirm}
                      disabled={confirming}
                    >
                      {confirming ? "确认中…" : "确认并生成解读"}
                    </Button>
                    <Button variant="outline" className="rounded-xl" onClick={reset}>
                      重新上传
                    </Button>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    确认后才会生成最终解读；字段可逐项修改。
                  </p>
                </>
              ) : (
                <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl bg-muted/50 text-center">
                  <p className="text-[15px] text-muted-foreground">
                    {busy ? "正在提取产品名称、类型、期限、风险等关键字段…" : "等待上传文件"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
