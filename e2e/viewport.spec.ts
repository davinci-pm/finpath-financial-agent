import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

/**
 * 双桌面尺寸检查：1280×800（手册 §15.1：1440×960 + 1280×800）
 * 断言：无横向滚动条（正文/关键信息不溢出）。
 */
test.use({ viewport: { width: 1280, height: 800 } });

const STATIC_ROUTES: Array<[string, string]> = [
  ["/", "P01 首页"],
  ["/documents/new", "P04 上传"],
  ["/learn/treasury-bonds", "P06 学习"],
  ["/routes/overseas-payment-card", "P07 办事路线"],
  ["/money-map", "P08 资金地图"],
  ["/money-map?drawer=add-asset", "P09 资产抽屉"],
  ["/tasks", "P10 任务中心"],
  ["/tasks/t-overseas-card", "P11 任务详情"],
];

for (const [route, name] of STATIC_ROUTES) {
  test(`${name} 1280×800 无横向滚动`, async ({ page }) => {
    await page.goto(route);
    await page.waitForTimeout(600);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${route} 存在横向溢出 ${overflow}px`).toBeLessThanOrEqual(0);
  });
}

test("P02 澄清 1280×800 无横向滚动", async ({ page }) => {
  const diag = await page.request.post("/api/diagnosis", {
    data: { question: "3 万元闲钱怎么安排？" },
  });
  const { session } = (await diag.json()) as { session: { id: string } };
  await page.goto(`/diagnosis/${session.id}`);
  await page.waitForTimeout(600);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("P03 行动路径 1280×800 无横向滚动", async ({ page }) => {
  const diag = await page.request.post("/api/diagnosis", {
    data: { question: "年终奖怎么安排？" },
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
  await page.goto(`/plans/${plan.id}`);
  await page.waitForTimeout(600);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("P05 产品解读 1280×800 无横向滚动", async ({ page }) => {
  const buf = readFileSync("e2e/fixtures/sample-product.pdf");
  const up = await page.request.post("/api/documents", {
    multipart: { file: { name: "p.pdf", mimeType: "application/pdf", buffer: buf } },
  });
  const { document: doc } = (await up.json()) as { document: { id: string } };
  await page.request.post(`/api/documents/${doc.id}/analyze`);
  const ex = await page.request.get(`/api/documents/${doc.id}`);
  const extraction = ((await ex.json()) as {
    extraction: { fields: Array<{ key: string; value: string }> };
  }).extraction;
  await page.request.patch(`/api/documents/${doc.id}/extraction`, {
    data: { confirmed: Object.fromEntries(extraction.fields.map((f) => [f.key, f.value])) },
  });
  await page.goto(`/documents/${doc.id}`);
  await page.waitForTimeout(600);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("侧栏 5 项顺序固定（首页/问AI/资金地图/学习/我的任务）", async ({ page }) => {
  await page.goto("/tasks");
  const items = await page
    .locator("nav[aria-label='主导航'] a")
    .allTextContents();
  expect(items.map((s) => s.trim())).toEqual(["首页", "问 AI", "资金地图", "学习", "我的任务"]);
});
