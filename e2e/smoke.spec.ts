import { expect, test } from "@playwright/test";

/**
 * 阶段 1 冒烟测试：核心路由可访问且不返回 404。
 * 两条核心闭环路由：P01→P02→P03→P10→P08、P04→P05→P10
 */
const CORE_ROUTES: Array<[string, string]> = [
  ["/", "P01 首页"],
  ["/ask", "问 AI 入口"],
  ["/diagnosis/demo-session", "P02 澄清"],
  ["/plans/demo-plan", "P03 行动路径"],
  ["/documents/new", "P04 上传"],
  ["/documents/demo-doc", "P05 产品解读"],
  ["/money-map", "P08 资金地图"],
  ["/tasks", "P10 任务中心"],
  ["/tasks/demo-task", "P11 任务详情"],
];

test.describe("路由冒烟", () => {
  for (const [route, name] of CORE_ROUTES) {
    test(`${name}（${route}）可访问`, async ({ page }) => {
      const res = await page.goto(route);
      expect(res?.status()).toBe(200);
      await expect(page.locator("body")).toBeVisible();
    });
  }

  test("首页包含 FinPath 品牌", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("FinPath", { exact: true }).first()).toBeVisible();
  });
});
