import { expect, test } from "@playwright/test";

/**
 * 阶段 6 质量检查：键盘导航、焦点指示、表单可访问标签。
 */

test("首页 Tab 聚焦元素有可见焦点指示（ring/outline）", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const hasIndicator = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return false;
    const s = getComputedStyle(el);
    return s.outlineStyle !== "none" || s.boxShadow !== "none";
  });
  expect(hasIndicator).toBe(true);
});

test("登录后页面 Tab 可依次聚焦侧栏导航", async ({ page }) => {
  await page.goto("/tasks");
  await page.waitForTimeout(500);
  // 按几次 Tab，应能聚焦到侧栏"首页"链接
  let focusedText = "";
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    focusedText = await page.evaluate(
      () => (document.activeElement as HTMLElement | null)?.textContent?.trim() ?? "",
    );
    if (focusedText.includes("首页")) break;
  }
  expect(focusedText).toContain("首页");
});

test("P09 抽屉表单输入具备可访问标签", async ({ page }) => {
  await page.goto("/money-map?drawer=add-asset");
  await expect(page.getByLabel("金额下限")).toBeVisible();
  await expect(page.getByLabel("金额上限")).toBeVisible();
  await expect(page.getByRole("button", { name: "保存到资金地图" })).toBeVisible();
});

test("P04 上传区具备可访问标签", async ({ page }) => {
  await page.goto("/documents/new");
  await expect(page.getByLabel("上传产品截图或 PDF")).toBeVisible();
});

test("P02 澄清问题具备 radiogroup 与单选项标签", async ({ page }) => {
  const diag = await page.request.post("/api/diagnosis", {
    data: { question: "年终奖怎么安排？" },
  });
  const { session } = (await diag.json()) as { session: { id: string } };
  await page.goto(`/diagnosis/${session.id}`);
  await expect(page.getByRole("radiogroup")).toBeVisible();
  const radios = page.getByRole("radio");
  await expect(radios).toHaveCount(4);
});

test("金额隐藏开关不改变 API 数据（仅视觉）", async ({ page }) => {
  const res = await page.request.get("/api/money-map");
  const { totalAssets } = (await res.json()) as { totalAssets: number };
  await page.goto("/money-map");
  await page.waitForTimeout(600);
  // 打开隐藏开关
  await page.getByRole("switch", { name: "隐藏金额" }).click();
  await expect(page.getByText("¥•••").first()).toBeVisible();
  // API 数据未变
  const res2 = await page.request.get("/api/money-map");
  const { totalAssets: after } = (await res2.json()) as { totalAssets: number };
  expect(after).toBe(totalAssets);
});
