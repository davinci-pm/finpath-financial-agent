import { readFileSync } from "node:fs";
import { expect, test, type APIRequestContext } from "@playwright/test";

async function createDiagnosis(request: APIRequestContext, question = "3 万元闲钱怎么安排？") {
  const response = await request.post("/api/diagnosis", { data: { question } });
  expect(response.status()).toBe(201);
  return (await response.json()) as { session: { id: string } };
}

async function uploadPdf(request: APIRequestContext) {
  const response = await request.post("/api/documents", {
    multipart: {
      file: {
        name: "product.pdf",
        mimeType: "application/pdf",
        buffer: readFileSync("e2e/fixtures/sample-product.pdf"),
      },
    },
  });
  expect(response.status()).toBe(201);
  return (await response.json()) as { document: { id: string } };
}

test.describe("API 契约与错误状态", () => {
  test("诊断接口拒绝非法 JSON、过短、过长和错误类型", async ({ request }) => {
    const malformed = await request.post("/api/diagnosis", {
      headers: { "content-type": "application/json" },
      data: "{not-json",
    });
    expect(malformed.status()).toBe(400);

    for (const question of ["", "a", "问".repeat(501), 30, null]) {
      const response = await request.post("/api/diagnosis", { data: { question } });
      expect(response.status(), `question=${String(question).slice(0, 20)}`).toBe(400);
    }
  });

  test("不存在的诊断、计划、任务和文档统一返回 404", async ({ request }) => {
    const checks = await Promise.all([
      request.get("/api/diagnosis/not-found"),
      request.get("/api/plans/not-found"),
      request.get("/api/tasks/not-found"),
      request.get("/api/documents/not-found"),
      request.post("/api/documents/not-found/analyze"),
      request.post("/api/documents/not-found/generate-report"),
    ]);
    expect(checks.map((response) => response.status())).toEqual([404, 404, 404, 404, 404, 404]);
  });

  test("澄清答案拒绝未知 key、空值和超长值", async ({ request }) => {
    const { session } = await createDiagnosis(request);
    for (const data of [
      { key: "unknown", value: "x" },
      { key: "expectedUseHorizon", value: "" },
      { key: "expectedUseHorizon", value: "x".repeat(41) },
    ]) {
      const response = await request.post(`/api/diagnosis/${session.id}/answer`, { data });
      expect(response.status()).toBe(400);
    }
  });

  test("澄清答案必须属于当前问题的选项", async ({ request }) => {
    const { session } = await createDiagnosis(request);
    const response = await request.post(`/api/diagnosis/${session.id}/answer`, {
      data: { key: "expectedUseHorizon", value: "not-an-option" },
    });
    expect(response.status()).toBe(400);
  });

  test("澄清答案必须按当前问题顺序提交", async ({ request }) => {
    const { session } = await createDiagnosis(request);
    const response = await request.post(`/api/diagnosis/${session.id}/answer`, {
      data: { key: "lossTolerance", value: "small" },
    });
    expect(response.status()).toBe(409);
  });

  test("澄清未完成前不得直接生成计划", async ({ request }) => {
    const { session } = await createDiagnosis(request);
    const response = await request.post(`/api/diagnosis/${session.id}/generate-plan`);
    expect(response.status()).toBe(409);
  });

  test("全部跳过时不得虚构成长周期或储备充足", async ({ request }) => {
    const { session } = await createDiagnosis(request);
    for (const key of [
      "expectedUseHorizon",
      "emergencyFundMonths",
      "highInterestDebt",
      "lossTolerance",
      "incomeStability",
    ]) {
      const response = await request.post(`/api/diagnosis/${session.id}/answer`, {
        data: { key, value: "skipped" },
      });
      expect(response.status()).toBe(200);
    }
    const planResponse = await request.post(`/api/diagnosis/${session.id}/generate-plan`);
    expect(planResponse.status()).toBe(201);
    const { plan } = (await planResponse.json()) as { plan: { rationale: string[] } };
    expect(plan.rationale.join(" ")).not.toMatch(/3 年以上期限|应急储备充足/);
  });

  test("资产接口覆盖创建、读取、更新、删除闭环", async ({ request }) => {
    const created = await request.post("/api/assets", {
      data: {
        kind: "asset",
        category: "现金与活期",
        label: `API 边界资产 ${Date.now()}`,
        amountExact: 12_345,
      },
    });
    expect(created.status()).toBe(201);
    const { asset } = (await created.json()) as { asset: { id: string } };

    const updated = await request.patch(`/api/assets/${asset.id}`, {
      data: { note: "已核验" },
    });
    expect(updated.status()).toBe(200);

    const listed = await request.get("/api/assets");
    const body = (await listed.json()) as { assets: Array<{ id: string; note?: string }> };
    expect(body.assets.find((item) => item.id === asset.id)?.note).toBe("已核验");

    const deleted = await request.delete(`/api/assets/${asset.id}`);
    expect(deleted.status()).toBe(200);
    expect((await request.delete(`/api/assets/${asset.id}`)).status()).toBe(404);
  });

  test("资产创建拒绝缺金额、负数、小数、倒置区间和非法币种", async ({ request }) => {
    const base = { kind: "asset", category: "现金", label: "边界资产" };
    const invalid = [
      base,
      { ...base, amountExact: 0 },
      { ...base, amountExact: -1 },
      { ...base, amountExact: 1.5 },
      { ...base, amountMin: 100, amountMax: 99 },
      { ...base, amountExact: 1, currency: "USD" },
    ];
    for (const data of invalid) {
      expect((await request.post("/api/assets", { data })).status()).toBe(400);
    }
  });

  test("资产局部更新后仍应满足完整金额区间约束", async ({ request }) => {
    const created = await request.post("/api/assets", {
      data: { kind: "asset", category: "现金", label: "区间资产", amountMin: 100, amountMax: 200 },
    });
    const { asset } = (await created.json()) as { asset: { id: string } };
    const response = await request.patch(`/api/assets/${asset.id}`, { data: { amountMin: 300 } });
    expect(response.status()).toBe(400);
  });

  test("任务接口拒绝非法输入与非法状态", async ({ request }) => {
    const invalidCreates = [
      {},
      { sourceType: "manual", sourceId: "", title: "A" },
      { sourceType: "manual", sourceId: "s", title: "" },
      { sourceType: "manual", sourceId: "s", title: "A", steps: [{ title: "", estimatedMinutes: 0 }] },
      { sourceType: "unknown", sourceId: "s", title: "A" },
    ];
    for (const data of invalidCreates) {
      expect((await request.post("/api/tasks", { data })).status()).toBe(400);
    }

    const created = await request.post("/api/tasks", {
      data: { sourceType: "manual", sourceId: "boundary", title: "边界任务", steps: [{ title: "第一步" }] },
    });
    const { task } = (await created.json()) as { task: { id: string } };
    expect((await request.patch(`/api/tasks/${task.id}`, { data: { status: "deleted" } })).status()).toBe(400);
    expect((await request.patch(`/api/tasks/${task.id}/steps/not-found`)).status()).toBe(404);
  });

  test("手动标记任务完成时进度与步骤必须一致", async ({ request }) => {
    const created = await request.post("/api/tasks", {
      data: {
        sourceType: "manual",
        sourceId: `status-${Date.now()}`,
        title: "状态一致性任务",
        steps: [{ title: "第一步" }, { title: "第二步" }],
      },
    });
    const { task } = (await created.json()) as { task: { id: string } };
    const response = await request.patch(`/api/tasks/${task.id}`, { data: { status: "completed" } });
    const { task: updated } = (await response.json()) as {
      task: { progressCurrent: number; progressTotal: number; steps: Array<{ status: string }> };
    };
    expect(updated.progressCurrent).toBe(updated.progressTotal);
    expect(updated.steps.every((step) => step.status === "done")).toBe(true);
  });

  test("文档接口接受三种支持格式并拒绝 txt", async ({ request }) => {
    for (const [name, mimeType, fixture] of [
      ["a.pdf", "application/pdf", "e2e/fixtures/sample-product.pdf"],
      ["a.png", "image/png", "e2e/fixtures/sample-product.png"],
      ["a.jpg", "image/jpeg", "e2e/fixtures/sample-product.jpg"],
    ] as const) {
      const response = await request.post("/api/documents", {
        multipart: { file: { name, mimeType, buffer: readFileSync(fixture) } },
      });
      expect(response.status(), name).toBe(201);
    }
    const rejected = await request.post("/api/documents", {
      multipart: { file: { name: "a.txt", mimeType: "text/plain", buffer: Buffer.from("text") } },
    });
    expect(rejected.status()).toBe(415);
  });

  test("文档接口拒绝超过 20MB 的文件", async ({ request }) => {
    const response = await request.post("/api/documents", {
      multipart: {
        file: { name: "oversize.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(20 * 1024 * 1024 + 1) },
      },
    });
    expect(response.status()).toBe(413);
  });

  test("文档接口拒绝空文件", async ({ request }) => {
    const response = await request.post("/api/documents", {
      multipart: { file: { name: "empty.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(0) } },
    });
    expect(response.status()).toBe(400);
  });

  test("文档接口拒绝扩展名与 MIME 伪装", async ({ request }) => {
    const responses = await Promise.all([
      request.post("/api/documents", {
        multipart: { file: { name: "payload.exe", mimeType: "application/pdf", buffer: Buffer.from("MZ") } },
      }),
      request.post("/api/documents", {
        multipart: { file: { name: "payload.pdf", mimeType: "application/octet-stream", buffer: Buffer.from("MZ") } },
      }),
    ]);
    expect(responses.map((response) => response.status())).toEqual([415, 415]);
  });

  test("文档接口拒绝扩展名与 MIME 均合法但文件头伪造的内容", async ({ request }) => {
    const response = await request.post("/api/documents", {
      multipart: {
        file: { name: "fake.pdf", mimeType: "application/pdf", buffer: Buffer.from("not really a pdf") },
      },
    });
    expect(response.status()).toBe(415);
  });

  test("未分析文档不能直接确认字段", async ({ request }) => {
    const { document } = await uploadPdf(request);
    const response = await request.patch(`/api/documents/${document.id}/extraction`, {
      data: { confirmed: { type: "存款" } },
    });
    expect(response.status()).toBe(409);
  });

  test("分析后不能用空字段集合完成确认", async ({ request }) => {
    const { document } = await uploadPdf(request);
    expect((await request.post(`/api/documents/${document.id}/analyze`)).status()).toBe(200);
    const response = await request.patch(`/api/documents/${document.id}/extraction`, {
      data: { confirmed: {} },
    });
    expect(response.status()).toBe(400);
  });

  test("确认字段必须与提取字段完整对应且不能夹带额外字段", async ({ request }) => {
    const { document } = await uploadPdf(request);
    const analyzed = await request.post(`/api/documents/${document.id}/analyze`);
    const { extraction } = (await analyzed.json()) as {
      extraction: { fields: Array<{ key: string; value: string }> };
    };
    const extracted = Object.fromEntries(extraction.fields.map((field) => [field.key, field.value]));
    const entries = Object.entries(extracted);
    const missing = Object.fromEntries(entries.slice(1));
    const extra = { ...extracted, injected: "value" };
    expect((await request.patch(`/api/documents/${document.id}/extraction`, { data: { confirmed: missing } })).status()).toBe(400);
    expect((await request.patch(`/api/documents/${document.id}/extraction`, { data: { confirmed: extra } })).status()).toBe(400);
  });
});
