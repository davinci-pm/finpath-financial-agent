"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type UploadPhase = "idle" | "uploading" | "analyzing" | "done" | "failed";

export type FileUploaderProps = {
  /** 文件选择/拖拽后触发（父组件执行真实上传与解析） */
  onFileSelected: (file: File) => void;
  /** 当前阶段（受控，由父组件驱动） */
  phase: UploadPhase;
  /** 已选文件名 */
  fileName?: string;
  /** 重新选择 */
  onReset?: () => void;
  /** 错误信息（failed 时展示） */
  error?: string;
  className?: string;
};

const ACCEPTED = [".pdf", ".png", ".jpg", ".jpeg"];

/**
 * P04 文件上传区：拖拽 / 选择文件。
 * 上传与解析由父组件通过 onFileSelected 执行（POST /api/documents → analyze）。
 */
export function FileUploader({
  onFileSelected,
  phase,
  fileName,
  onReset,
  error,
  className,
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
    if (!ACCEPTED.includes(ext)) {
      onFileSelected(file); // 父组件负责 MIME/大小校验并置 failed
      return;
    }
    onFileSelected(file);
  };

  const busy = phase === "uploading" || phase === "analyzing";
  const failed = phase === "failed";

  return (
    <div className={className}>
      <div
        role="button"
        tabIndex={0}
        aria-label="上传产品截图或 PDF"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !busy) inputRef.current?.click();
        }}
        className={cn(
          "flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-8 py-10 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
          dragOver ? "border-primary bg-primary-soft/60" : "border-border bg-white",
          busy && "cursor-wait",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            if (inputRef.current) inputRef.current.value = "";
          }}
        />

        {busy ? (
          <Loader2 className="size-9 animate-spin text-primary" aria-hidden />
        ) : failed ? (
          <X className="size-9 text-destructive" aria-hidden />
        ) : (
          <UploadCloud className="size-9 text-primary" aria-hidden />
        )}

        <p className="mt-4 text-[17px] font-medium text-foreground">
          {phase === "uploading"
            ? "正在上传…"
            : phase === "analyzing"
              ? "正在解析文件…"
              : failed
                ? "上传或解析失败"
                : phase === "done" && fileName
                  ? fileName
                  : "拖入产品截图或 PDF"}
        </p>
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {failed && error
            ? error
            : "支持 JPG、PNG、PDF（≤20MB），建议先遮挡姓名、账号和身份证信息。"}
        </p>

        {phase !== "done" && phase !== "failed" ? (
          <Button variant="secondary" className="mt-4 rounded-xl" disabled={busy}>
            {busy ? (
              <span className="flex items-center gap-2">
                <FileText className="size-4" aria-hidden />
                处理中
              </span>
            ) : (
              "选择文件"
            )}
          </Button>
        ) : (
          <Button
            variant="outline"
            className="mt-4 rounded-xl"
            onClick={(e) => {
              e.stopPropagation();
              onReset?.();
            }}
          >
            重新选择
          </Button>
        )}
      </div>

      <ol className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        {["上传材料", "确认字段", "查看解读"].map((s, i, arr) => (
          <li key={s} className="flex items-center gap-2">
            <span>{s}</span>
            {i < arr.length - 1 ? <span aria-hidden>→</span> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
