"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/layout/app-shell";
import { DocumentFieldRow } from "@/components/finpath/document-field-row";
import { FileUploader, type UploadPhase } from "@/components/finpath/file-uploader";
import { RiskNotice } from "@/components/finpath/risk-notice";
import { MOCK_DOCUMENT } from "@/lib/mock-data";

/**
 * P04 金融产品上传与识别确认页
 * 上传状态：上传中 / 解析中 / 完成 / 失败；用户确认前不生成最终解读。
 * 参考：P04-document-upload.png
 */
export default function DocumentNewPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [fileName, setFileName] = useState(MOCK_DOCUMENT.fileName);

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
            onPhaseChange={(p, name) => {
              setPhase(p);
              if (name) setFileName(name);
            }}
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
                    {MOCK_DOCUMENT.fields.map((f) => (
                      <DocumentFieldRow key={f.key} field={f} />
                    ))}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button
                      className="flex-1 rounded-xl"
                      onClick={() => router.push(`/documents/${MOCK_DOCUMENT.id}`)}
                    >
                      确认并生成解读
                    </Button>
                    <Button variant="outline" className="rounded-xl" onClick={() => setPhase("idle")}>
                      重新上传
                    </Button>
                  </div>
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
