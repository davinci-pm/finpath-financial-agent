import { readFileSync } from "node:fs";
import { test } from "@playwright/test";

/**
 * 1440×960 页面截图（与原型图 P01-P11 对照）
 * 动态页（P02/P03/P05）先通过 API 准备数据，确保截图为真实渲染状态。
 */
test.use({ viewport: { width: 1440, height: 960 } });

test("p01-home 1440×960 截图", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "screenshots/p01-home.png" });
});

test("p02-clarification 1440×960 截图", async ({ page }) => {
  const diag = await page.request.post("/api/diagnosis", {
    data: { question: "我有 3 万元闲钱，想稳一点也想学投资" },
  });
  const { session } = (await diag.json()) as { session: { id: string } };
  await page.goto(`/diagnosis/${session.id}`);
  await page.waitForTimeout(500);
  await page.screenshot({ path: "screenshots/p02-clarification.png" });
});

test("p03-action-plan 1440×960 截图", async ({ page }) => {
  const planId = await createPlan(page);
  await page.goto(`/plans/${planId}`);
  await page.waitForTimeout(500);
  await page.screenshot({ path: "screenshots/p03-action-plan.png" });
});

test("p04-document-upload 1440×960 截图", async ({ page }) => {
  await page.goto("/documents/new");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "screenshots/p04-document-upload.png" });
});

test("p05-product-analysis 1440×960 截图", async ({ page }) => {
  const docId = await createConfirmedDocument(page);
  await page.goto(`/documents/${docId}`);
  await page.waitForTimeout(600);
  await page.screenshot({ path: "screenshots/p05-product-analysis.png" });
});

test("p06-learning 1440×960 截图", async ({ page }) => {
  await page.goto("/learn/treasury-bonds");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "screenshots/p06-learning.png" });
});

test("p07-financial-route 1440×960 截图", async ({ page }) => {
  await page.goto("/routes/overseas-payment-card");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "screenshots/p07-financial-route.png" });
});

test("p08-money-map 1440×960 截图", async ({ page }) => {
  await page.goto("/money-map");
  await page.waitForTimeout(700);
  await page.screenshot({ path: "screenshots/p08-money-map.png" });
});

test("p09-add-asset-drawer 1440×960 截图", async ({ page }) => {
  await page.goto("/money-map?drawer=add-asset");
  await page.waitForTimeout(700);
  await page.screenshot({ path: "screenshots/p09-add-asset-drawer.png" });
});

test("p10-task-center 1440×960 截图", async ({ page }) => {
  await page.goto("/tasks");
  await page.waitForTimeout(600);
  await page.screenshot({ path: "screenshots/p10-task-center.png" });
});

test("p11-task-detail 1440×960 截图", async ({ page }) => {
  await page.goto("/tasks/t-overseas-card");
  await page.waitForTimeout(600);
  await page.screenshot({ path: "screenshots/p11-task-detail.png" });
});

/* ============ 数据准备辅助 ============ */

async function createPlan(page: import("@playwright/test").Page): Promise<string> {
  const diag = await page.request.post("/api/diagnosis", {
    data: { question: "年终奖 5 万怎么安排？" },
  });
  const { session } = (await diag.json()) as { session: { id: string } };
  for (const [key, value] of [
    ["expectedUseHorizon", "1_to_3y"],
    ["emergencyFundMonths", "4.5"],
    ["highInterestDebt", "false"],
    ["lossTolerance", "small"],
    ["incomeStability", "medium"],
  ]) {
    await page.request.post(`/api/diagnosis/${session.id}/answer`, { data: { key, value } });
  }
  const planRes = await page.request.post(`/api/diagnosis/${session.id}/generate-plan`);
  const { plan } = (await planRes.json()) as { plan: { id: string } };
  return plan.id;
}

async function createConfirmedDocument(page: import("@playwright/test").Page): Promise<string> {
  const buf = readFileSync("e2e/fixtures/sample-product.pdf");
  const up = await page.request.post("/api/documents", {
    multipart: {
      file: { name: "product.pdf", mimeType: "application/pdf", buffer: buf },
    },
  });
  const { document } = (await up.json()) as { document: { id: string } };
  await page.request.post(`/api/documents/${document.id}/analyze`);
  const ex = await page.request.get(`/api/documents/${document.id}`);
  const extraction = ((await ex.json()) as {
    extraction: { fields: Array<{ key: string; value: string }> };
  }).extraction;
  await page.request.patch(`/api/documents/${document.id}/extraction`, {
    data: { confirmed: Object.fromEntries(extraction.fields.map((f) => [f.key, f.value])) },
  });
  return document.id;
}
