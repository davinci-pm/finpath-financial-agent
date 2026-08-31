import { describe, expect, it, beforeEach } from "vitest";
import { DemoRepository } from "@/lib/server/repository";
import {
  isAcceptedFile,
  maxUploadBytes,
  type DocumentAnalyzer,
} from "@/lib/server/documents/analyzer";
import { MockDocumentAnalyzer } from "@/lib/server/documents/mock-analyzer";
import { generateReport } from "@/lib/server/documents/report";
import type { DocumentField } from "@/lib/types";

const USER = "demo-user";

describe("DocumentAnalyzer 独立接口", () => {
  it("Mock 输出字段包含 来源/置信度/页码/原文片段", async () => {
    const analyzer: DocumentAnalyzer = new MockDocumentAnalyzer();
    const fields = await analyzer.analyze({
      buffer: Buffer.from("%PDF-test"),
      fileName: "product.pdf",
      mimeType: "application/pdf",
    });
    expect(fields.length).toBeGreaterThan(0);
    for (const f of fields) {
      expect(["file", "ai", "unknown"]).toContain(f.source);
      expect(typeof f.confidence).toBe("number");
      expect(f).toHaveProperty("page");
      expect(f).toHaveProperty("snippet");
    }
    const name = fields.find((f) => f.key === "name");
    expect(name?.page).toBe(1);
    expect(name?.snippet).toBeTruthy();
  });

  it("接口与文本模型解耦：analyze 只接收 buffer/fileName/mimeType", () => {
    const analyzer: DocumentAnalyzer = new MockDocumentAnalyzer();
    expect(typeof analyzer.analyze).toBe("function");
    expect(analyzer.name).toBeTruthy();
  });
});

describe("文件类型与大小限制", () => {
  it("接受 PDF/PNG/JPG，拒绝其他类型", () => {
    expect(isAcceptedFile("a.pdf", "application/pdf")).toBe(true);
    expect(isAcceptedFile("a.png", "image/png")).toBe(true);
    expect(isAcceptedFile("a.jpg", "image/jpeg")).toBe(true);
    expect(isAcceptedFile("a.txt", "text/plain")).toBe(false);
    expect(isAcceptedFile("a.exe", "application/octet-stream")).toBe(false);
  });

  it("默认 4MB 限制，可被 MAX_UPLOAD_MB 覆盖", () => {
    expect(maxUploadBytes()).toBe(4 * 1024 * 1024);
    const prev = process.env.MAX_UPLOAD_MB;
    process.env.MAX_UPLOAD_MB = "5";
    expect(maxUploadBytes()).toBe(5 * 1024 * 1024);
    if (prev === undefined) delete process.env.MAX_UPLOAD_MB;
    else process.env.MAX_UPLOAD_MB = prev;
  });
});

describe("文档闭环（DemoRepository）", () => {
  let repo: DemoRepository;

  beforeEach(() => {
    repo = new DemoRepository();
  });

  it("上传 → 分析 → 字段提取（含来源/页码/置信度）→ 等待确认", async () => {
    const doc = await repo.createDocument(USER, {
      fileName: "某银行稳健理财产品说明.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024,
      buffer: Buffer.from("%PDF-1.4 test"),
    });
    expect(doc.status).toBe("uploading");

    const buffer = await repo.getDocumentBuffer(USER, doc.id);
    const analyzer = new MockDocumentAnalyzer();
    const fields = await analyzer.analyze({
      buffer: buffer!,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
    });

    const extraction = await repo.saveExtraction(USER, doc.id, fields);
    expect(extraction.status).toBe("extracted");
    expect(extraction.fields.length).toBeGreaterThan(0);
    const updated = await repo.getDocument(USER, doc.id);
    expect(updated?.status).toBe("awaiting_confirmation");
  });

  it("用户确认字段后才进入 ready（确认前不生成解读）", async () => {
    const doc = await repo.createDocument(USER, {
      fileName: "p.png",
      mimeType: "image/png",
      sizeBytes: 10,
      buffer: Buffer.from("png"),
    });
    const fields: DocumentField[] = [
      { key: "type", label: "产品类型", value: "净值型银行理财", source: "ai", confidence: 0.6, page: null, snippet: "截图" },
    ];
    await repo.saveExtraction(USER, doc.id, fields);

    const extraction = await repo.getExtraction(USER, doc.id);
    expect(extraction?.status).toBe("extracted");

    const confirmed = await repo.confirmExtraction(USER, doc.id, { type: "净值型银行理财（确认）" });
    expect(confirmed.status).toBe("confirmed");
    expect(confirmed.confirmedFields.type).toBe("净值型银行理财（确认）");
    const updated = await repo.getDocument(USER, doc.id);
    expect(updated?.status).toBe("ready");
  });
});

describe("确定性解读生成（基于确认字段）", () => {
  const baseFields: DocumentField[] = [
    { key: "name", label: "产品名称", value: "示例产品", source: "file", confidence: 0.98, page: 1, snippet: "示例" },
    { key: "type", label: "产品类型", value: "净值型银行理财", source: "file", confidence: 0.95, page: 1, snippet: "净值型" },
    { key: "term", label: "期限", value: "约 365 天", source: "file", confidence: 0.9, page: 2, snippet: "365" },
    { key: "guaranteed", label: "是否保本", value: "否", source: "ai", confidence: 0.8, page: 1, snippet: "不保本" },
    { key: "fees", label: "费用", value: "未识别", source: "unknown", confidence: 0, page: null, snippet: "" },
  ];

  it("非保本 → 结论为「它不是保本存款」且关键信息带来源", () => {
    const report = generateReport("doc-1", {}, baseFields);
    expect(report.conclusion).toBe("它不是保本存款");
    expect(report.markers.some((m) => m.label.includes("本金可能波动"))).toBe(true);
    expect(report.keyInfo.some((k) => k.label === "产品类型")).toBe(true);
    expect(report.keyInfo.every((k) => ["file", "ai", "unknown", "official", "platform"].includes(k.source))).toBe(true);
  });

  it("未识别字段进入「购买前还要确认」", () => {
    const report = generateReport("doc-2", {}, baseFields);
    expect(report.questionsToAsk.some((q) => q.includes("费用"))).toBe(true);
  });

  it("用户确认值覆盖提取值", () => {
    const report = generateReport("doc-3", { term: "约 180 天" }, baseFields);
    expect(report.markers.some((m) => m.label.includes("180 天"))).toBe(true);
  });

  it("保本 → 结论为保本且风险标记为 info", () => {
    const guaranteedFields = baseFields.map((f) =>
      f.key === "guaranteed" ? { ...f, value: "是" } : f,
    );
    const report = generateReport("doc-4", {}, guaranteedFields);
    expect(report.conclusion).toBe("它是保本产品（以合同为准）");
    expect(report.markers.some((m) => m.label === "保本（以合同为准）")).toBe(true);
  });
});
