import { test } from "@playwright/test";

/**
 * 1440×960 页面截图（阶段 1 交付：P01 视觉基准 + 登录后框架示例）
 * 截图保存至 screenshots/，供与原型图 P01-home.png 对照。
 */
test.use({ viewport: { width: 1440, height: 960 } });

test("P01 首页 1440×960 截图", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(600);
  await page.screenshot({ path: "screenshots/p01-home.png" });
});

test("P10 任务中心（AppShell 框架）1440×960 截图", async ({ page }) => {
  await page.goto("/tasks");
  await page.waitForTimeout(600);
  await page.screenshot({ path: "screenshots/p10-tasks-placeholder.png" });
});

test("问 AI 入口（AppShell 框架）1440×960 截图", async ({ page }) => {
  await page.goto("/ask");
  await page.waitForTimeout(600);
  await page.screenshot({ path: "screenshots/p00-ask-placeholder.png" });
});
