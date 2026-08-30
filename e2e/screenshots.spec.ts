import { test } from "@playwright/test";

/**
 * 1440×960 页面截图（与原型图 P01-P11 对照）
 * 原型图位于 FinPath_前端原型图_P01-P11/（1536×1024，按比例缩放对比）。
 */
test.use({ viewport: { width: 1440, height: 960 } });

const SHOTS: Array<[string, string]> = [
  ["/", "p01-home"],
  ["/diagnosis/demo-session?q=我有%203%20万元暂时不用", "p02-clarification"],
  ["/plans/demo-plan", "p03-action-plan"],
  ["/documents/new", "p04-document-upload"],
  ["/documents/doc-bank-product", "p05-product-analysis"],
  ["/learn/treasury-bonds", "p06-learning"],
  ["/routes/overseas-payment-card", "p07-financial-route"],
  ["/money-map", "p08-money-map"],
  ["/money-map?drawer=add-asset", "p09-add-asset-drawer"],
  ["/tasks", "p10-task-center"],
  ["/tasks/t-overseas-card", "p11-task-detail"],
];

for (const [route, name] of SHOTS) {
  test(`${name} 1440×960 截图`, async ({ page }) => {
    await page.goto(route);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `screenshots/${name}.png` });
  });
}
