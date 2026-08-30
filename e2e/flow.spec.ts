import { expect, test } from "@playwright/test";

/**
 * 阶段 2 主链路冒烟（静态 Mock 版）：
 * 链路 A：P01 输入 → P02 澄清 → P03 行动路径 → P10 任务中心 → P08 资金地图
 * 链路 B：P04 上传 → P05 产品解读 → P10 任务中心
 */
test.describe("主链路 A：资金行动路径", () => {
  test("P01 输入问题跳转 P02 澄清", async ({ page }) => {
    await page.goto("/");
    const input = page.getByLabel("输入你的金融问题");
    await input.fill("我有 3 万元暂时不用，怎么安排？");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/diagnosis\/demo-session/);
    await expect(page.getByText("当前情况")).toBeVisible();
  });

  test("P02 回答问题后进入 P03 行动路径", async ({ page }) => {
    await page.goto("/diagnosis/demo-session");
    // 第一题：期限（默认选中 1～3 年）
    await page.getByRole("radio", { name: "1～3 年" }).click();
    await page.getByRole("button", { name: "下一步" }).click();
    // 第二题：应急储备
    await page.getByRole("radio", { name: "3～6 个月" }).click();
    await page.getByRole("button", { name: "下一步" }).click();
    // 第三题：亏损承受能力 → 生成路径
    await page.getByRole("radio", { name: "小幅波动可以接受" }).click();
    await page.getByRole("button", { name: "下一步" }).click();
    await expect(page).toHaveURL(/\/plans\/demo-plan/);
    await expect(page.getByRole("heading", { name: "你的资金安排路径" })).toBeVisible();
  });

  test("P03 保存任务后进入 P10 任务中心", async ({ page }) => {
    await page.goto("/plans/demo-plan");
    await page.getByRole("link", { name: /保存为我的金融任务/ }).click();
    await expect(page).toHaveURL(/\/tasks/);
    await expect(page.getByRole("heading", { name: "我的金融任务" })).toBeVisible();
  });

  test("P10 任务卡可进入任务详情", async ({ page }) => {
    await page.goto("/tasks");
    await page.locator('a[href="/tasks/t-30k-plan"]').click();
    await expect(page).toHaveURL(/\/tasks\/t-30k-plan/);
    await expect(page.getByText("任务目标")).toBeVisible();
  });
});

test.describe("主链路 B：产品解读", () => {
  test("P04 上传后确认进入 P05 解读", async ({ page }) => {
    await page.goto("/documents/new");
    // 触发模拟上传（fixture PDF）→ 等待识别完成
    await page.locator('input[type="file"]').setInputFiles("e2e/fixtures/sample-product.pdf");
    await expect(page.getByRole("button", { name: "确认并生成解读" })).toBeVisible({
      timeout: 10000,
    });
    await page.getByRole("button", { name: "确认并生成解读" }).click();
    await expect(page).toHaveURL(/\/documents\/doc-bank-product/);
    await expect(page.getByText(/先说结论/)).toBeVisible();
  });

  test("P05 保存任务跳转 P10", async ({ page }) => {
    await page.goto("/documents/doc-bank-product");
    await page.getByRole("link", { name: /保存到我的任务/ }).first().click();
    await expect(page).toHaveURL(/\/tasks/);
  });
});

test.describe("交互状态", () => {
  test("P11 完成步骤后进度立即更新", async ({ page }) => {
    await page.goto("/tasks/t-overseas-card");
    const before = await page
      .locator('div[role="progressbar"]')
      .first()
      .getAttribute("aria-valuenow");
    // 进行中步骤默认展开，直接完成
    await page.getByRole("button", { name: "完成这一步" }).click();
    const after = await page
      .locator('div[role="progressbar"]')
      .first()
      .getAttribute("aria-valuenow");
    expect(Number(after)).toBeGreaterThan(Number(before));
  });

  test("P09 抽屉可打开并包含隐私说明", async ({ page }) => {
    await page.goto("/money-map?drawer=add-asset");
    await expect(page.getByText("添加一项资产")).toBeVisible();
    await expect(page.getByText(/无需填写银行卡号、账户密码或验证码/)).toBeVisible();
  });
});
