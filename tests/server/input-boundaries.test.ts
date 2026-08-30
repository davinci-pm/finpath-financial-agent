import { describe, expect, it } from "vitest";
import {
  AssetInputSchema,
  CreateTaskSchema,
  TaskStepInputSchema,
  UpdateTaskStatusSchema,
} from "@/lib/server/schemas";
import { isAcceptedFile, maxUploadBytes } from "@/lib/server/documents/analyzer";

const validAsset = {
  kind: "asset",
  category: "现金与活期",
  label: "备用金",
  amountExact: 10_000,
  currency: "CNY",
} as const;

describe("资产输入边界", () => {
  it.each([
    ["精确金额", validAsset, true],
    ["合法区间", { ...validAsset, amountExact: undefined, amountMin: 1, amountMax: 2 }, true],
    ["缺少金额", { ...validAsset, amountExact: undefined }, false],
    ["金额为零", { ...validAsset, amountExact: 0 }, false],
    ["金额为负数", { ...validAsset, amountExact: -1 }, false],
    ["金额为小数", { ...validAsset, amountExact: 0.01 }, false],
    ["区间上下限颠倒", { ...validAsset, amountExact: undefined, amountMin: 2, amountMax: 1 }, false],
    ["缺少区间上限", { ...validAsset, amountExact: undefined, amountMin: 1 }, false],
    ["空类别", { ...validAsset, category: "" }, false],
    ["类别过长", { ...validAsset, category: "类".repeat(41) }, false],
    ["空名称", { ...validAsset, label: "" }, false],
    ["名称过长", { ...validAsset, label: "名".repeat(81) }, false],
    ["非法币种", { ...validAsset, currency: "USD" }, false],
    ["非法类型", { ...validAsset, kind: "investment" }, false],
    ["备注 200 字", { ...validAsset, note: "注".repeat(200) }, true],
    ["备注 201 字", { ...validAsset, note: "注".repeat(201) }, false],
  ] as const)("%s", (_name, input, expected) => {
    expect(AssetInputSchema.safeParse(input).success).toBe(expected);
  });
});

describe("任务输入边界", () => {
  const validTask = {
    sourceType: "manual",
    sourceId: "source-1",
    title: "核验合同",
    steps: [{ title: "阅读费用条款", estimatedMinutes: 5 }],
  } as const;

  it.each([
    ["合法任务", validTask, true],
    ["空来源 ID", { ...validTask, sourceId: "" }, false],
    ["空标题", { ...validTask, title: "" }, false],
    ["标题 120 字", { ...validTask, title: "任".repeat(120) }, true],
    ["标题 121 字", { ...validTask, title: "任".repeat(121) }, false],
    ["最多 20 步", { ...validTask, steps: Array.from({ length: 20 }, (_, i) => ({ title: `步骤 ${i}` })) }, true],
    ["超过 20 步", { ...validTask, steps: Array.from({ length: 21 }, (_, i) => ({ title: `步骤 ${i}` })) }, false],
    ["非法来源类型", { ...validTask, sourceType: "trading" }, false],
  ] as const)("%s", (_name, input, expected) => {
    expect(CreateTaskSchema.safeParse(input).success).toBe(expected);
  });

  it("步骤时间必须是正整数", () => {
    expect(TaskStepInputSchema.safeParse({ title: "A", estimatedMinutes: 1 }).success).toBe(true);
    expect(TaskStepInputSchema.safeParse({ title: "A", estimatedMinutes: 0 }).success).toBe(false);
    expect(TaskStepInputSchema.safeParse({ title: "A", estimatedMinutes: 1.5 }).success).toBe(false);
  });

  it.each(["in_progress", "pending", "completed"])("接受任务状态 %s", (status) => {
    expect(UpdateTaskStatusSchema.safeParse({ status }).success).toBe(true);
  });

  it("拒绝未知任务状态", () => {
    expect(UpdateTaskStatusSchema.safeParse({ status: "deleted" }).success).toBe(false);
  });
});

describe("文件上传输入边界", () => {
  it.each([
    ["product.pdf", "application/pdf", true],
    ["product.PDF", "application/pdf", true],
    ["product.png", "image/png", true],
    ["product.jpeg", "image/jpeg", true],
    ["product.txt", "text/plain", false],
    ["product.exe", "application/octet-stream", false],
  ] as const)("%s / %s", (fileName, mimeType, expected) => {
    expect(isAcceptedFile(fileName, mimeType)).toBe(expected);
  });

  it("默认上传上限为 20MB", () => {
    expect(maxUploadBytes()).toBe(20 * 1024 * 1024);
  });

  it("扩展名与 MIME 任一不匹配时都应拒绝，避免仅改名绕过校验", () => {
    expect(isAcceptedFile("payload.exe", "application/pdf")).toBe(false);
    expect(isAcceptedFile("payload.pdf", "application/octet-stream")).toBe(false);
  });
});
