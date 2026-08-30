import { expect, test } from "@playwright/test";

const CONSOLE_AUDIT_ROUTES = [
  "/",
  "/ask",
  "/documents/new",
  "/learn",
  "/learn/treasury-bonds",
  "/routes/overseas-payment-card",
  "/money-map",
  "/tasks",
] as const;

for (const route of CONSOLE_AUDIT_ROUTES) {
  test(`${route} 无未捕获异常或 console.error`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(`console: ${message.text()}`);
    });
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
  });
}

test("首页空白不可提交，Shift+Enter 换行，Enter 创建诊断", async ({ page }) => {
  await page.goto("/");
  const input = page.getByLabel("输入你的金融问题");
  const submit = page.getByRole("button", { name: "发送问题" });
  await expect(submit).toBeDisabled();
  await input.fill("   ");
  await expect(submit).toBeDisabled();

  await input.fill("第一行");
  await input.press("Shift+Enter");
  await input.type("第二行");
  await expect(input).toHaveValue("第一行\n第二行");
  await input.press("Enter");
  await expect(page).toHaveURL(/\/diagnosis\//);
});

test("首页四个场景入口均可到达有效页面", async ({ page }) => {
  await page.goto("/");
  const links = await page.locator("main a").evaluateAll((nodes) =>
    nodes.map((node) => (node as HTMLAnchorElement).getAttribute("href")).filter(Boolean) as string[],
  );
  expect(links.length).toBeGreaterThanOrEqual(4);
  for (const href of new Set(links)) {
    const response = await page.request.get(href);
    expect(response.status(), href).toBeLessThan(400);
  }
});

test("澄清单选组应支持方向键选择", async ({ page }) => {
  const response = await page.request.post("/api/diagnosis", {
    data: { question: "方向键测试：3 万元怎么安排？" },
  });
  const { session } = (await response.json()) as { session: { id: string } };
  await page.goto(`/diagnosis/${session.id}`);
  const radios = page.getByRole("radio");
  await radios.first().focus();
  await page.keyboard.press("ArrowDown");
  await expect(radios.nth(1)).toHaveAttribute("aria-checked", "true");
});

test("已回答条件应可返回修改且保留原答案", async ({ page }) => {
  const response = await page.request.post("/api/diagnosis", {
    data: { question: "返回修改测试：年终奖怎么安排？" },
  });
  const { session } = (await response.json()) as { session: { id: string } };
  await page.request.post(`/api/diagnosis/${session.id}/answer`, {
    data: { key: "expectedUseHorizon", value: "1_to_3y" },
  });
  await page.goto(`/diagnosis/${session.id}`);
  await page.getByRole("button", { name: "编辑期限" }).click();
  await expect(
    page.getByRole("heading", { name: "这笔钱大概多久以后可能用到？" }),
  ).toBeVisible();
  await expect(page.getByRole("radio", { name: "1～3 年" })).toHaveAttribute("aria-checked", "true");
});

test("澄清未完成时页面不展示误导性的直接生成入口", async ({ page }) => {
  const response = await page.request.post("/api/diagnosis", {
    data: { question: "未完成澄清时不应直接生成" },
  });
  const { session } = (await response.json()) as { session: { id: string } };
  await page.goto(`/diagnosis/${session.id}`);
  await expect(page.getByRole("button", { name: /直接生成|生成行动路径/ })).toHaveCount(0);
});

test("首页工作台和免费提问入口均可导航", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "进入工作台" })).toHaveAttribute("href", "/money-map");
  await expect(page.getByRole("link", { name: "免费问一问" })).toHaveAttribute("href", "/ask");
});

test("问 AI 页面应提供可工作的提问入口", async ({ page }) => {
  await page.goto("/ask");
  const input = page.getByLabel("输入你的金融问题");
  await input.fill("房贷和应急金应该先处理哪个？");
  await input.press("Enter");
  await expect(page).toHaveURL(/\/diagnosis\//);
});

test("资金地图顶部 AI 输入提交后应进入诊断", async ({ page }) => {
  await page.goto("/money-map");
  const input = page.getByLabel("输入你的金融问题");
  await input.fill("如何把应急覆盖提高到 6 个月？");
  await input.press("Enter");
  await expect(page).toHaveURL(/\/diagnosis\//);
});

test("文档字段修改值必须进入最终解读", async ({ page }) => {
  await page.goto("/documents/new");
  await page.locator('input[type="file"]').setInputFiles("e2e/fixtures/sample-product.pdf");
  await expect(page.getByRole("button", { name: "确认并生成解读" })).toBeVisible();

  await page.getByRole("button", { name: "修改产品名称" }).click();
  const editor = page.getByLabel("编辑产品名称");
  await editor.fill("用户确认后的产品名称");
  await editor.press("Enter");
  await page.getByRole("button", { name: "确认并生成解读" }).click();

  await expect(page).toHaveURL(/\/documents\//);
  await expect(page.getByText(/先说结论/)).toBeVisible();
  const documentId = new URL(page.url()).pathname.split("/").filter(Boolean).at(-1)!;
  const response = await page.request.post(`/api/documents/${documentId}/generate-report`);
  const { report } = (await response.json()) as {
    report: { keyInfo: Array<{ label: string; value: string }> };
  };
  expect(report.keyInfo.find((item) => item.label === "产品名称")?.value).toBe(
    "用户确认后的产品名称",
  );
});

test("资产抽屉倒置金额区间应留在表单并展示错误", async ({ page }) => {
  await page.goto("/money-map?drawer=add-asset");
  await page.getByLabel("金额下限").fill("30000");
  await page.getByLabel("金额上限").fill("20000");
  await page.getByRole("button", { name: "保存到资金地图" }).click();
  await expect(page.getByRole("alert")).toContainText("金额下限不能大于上限");
  await expect(page.getByText("添加一项资产")).toBeVisible();
});

test("资产切换为负债时必须重置为负债类别", async ({ page }) => {
  const beforeResponse = await page.request.get("/api/assets");
  const before = (await beforeResponse.json()) as { assets: Array<{ id: string }> };
  const beforeIds = new Set(before.assets.map((asset) => asset.id));

  await page.goto("/money-map?drawer=add-asset");
  await page.getByRole("tab", { name: "负债" }).click();
  await page.getByRole("button", { name: "保存到资金地图" }).click();
  await expect(page.getByText("已保存到资金地图")).toBeVisible();

  const afterResponse = await page.request.get("/api/assets");
  const after = (await afterResponse.json()) as {
    assets: Array<{ id: string; kind: string; category: string }>;
  };
  const added = after.assets.find((asset) => !beforeIds.has(asset.id));
  expect(added?.kind).toBe("liability");
  expect(["贷款", "信用卡分期", "其他欠款"]).toContain(added?.category);
});

test("学习题错误与正确答案均有即时反馈", async ({ page }) => {
  await page.goto("/learn/treasury-bonds");
  const submit = page.getByRole("button", { name: "提交判断" });
  await expect(submit).toBeDisabled();
  await page.getByRole("radio").first().click();
  await submit.click();
  await expect(page.getByRole("status")).toBeVisible();

  await page.getByRole("radio", { name: "确认期限与自己用钱时间是否匹配" }).click();
  await submit.click();
  await expect(page.getByRole("status")).toContainText("正确");
});

test("学习题单选组支持方向键并采用游标式 Tab 顺序", async ({ page }) => {
  await page.goto("/learn/emergency-fund");
  const radios = page.getByRole("radio");
  await radios.first().focus();
  await page.keyboard.press("ArrowDown");
  await expect(radios.nth(1)).toHaveAttribute("aria-checked", "true");
  await expect(radios.nth(1)).toBeFocused();
  await expect(radios.first()).toHaveAttribute("tabindex", "-1");
});

test("学习进度刷新后仍应保存", async ({ page }) => {
  await page.goto("/learn/treasury-bonds");
  await page.getByRole("radio", { name: "确认期限与自己用钱时间是否匹配" }).click();
  await page.getByRole("button", { name: "提交判断" }).click();
  await expect(page.getByRole("status")).toContainText("正确");
  await page.reload();
  await expect(page.getByRole("status")).toContainText("正确");
});

test("四个学习主题展示各自内容，未知主题显示错误", async ({ page }) => {
  const topics = [
    ["treasury-bonds", "为什么国债也有期限和价格变化？"],
    ["emergency-fund", "应急储备应该覆盖什么"],
    ["fund-basics", "定投不能消除波动"],
    ["gold-basics", "黄金不是稳定收益工具"],
  ] as const;
  for (const [slug, heading] of topics) {
    await page.goto(`/learn/${slug}`);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
  await page.goto("/learn/not-a-topic");
  await expect(page.getByText("没有找到这个学习主题")).toBeVisible();
});

test("办事路线步骤可展开收起，清单可切换", async ({ page }) => {
  await page.goto("/routes/overseas-payment-card");
  const stepButtons = page.locator('section[aria-label="办理步骤"] > div > button');
  expect(await stepButtons.count()).toBeGreaterThan(1);
  const first = stepButtons.first();
  const wasExpanded = await first.getAttribute("aria-expanded");
  await first.click();
  await expect(first).toHaveAttribute("aria-expanded", wasExpanded === "true" ? "false" : "true");

  const openStep = stepButtons.filter({ has: page.getByText("进行中", { exact: true }) }).first();
  if ((await openStep.count()) > 0 && (await openStep.getAttribute("aria-expanded")) !== "true") {
    await openStep.click();
  }
  const checklist = page.locator('section[aria-label="办理步骤"] button[aria-pressed]').first();
  const before = await checklist.getAttribute("aria-pressed");
  await checklist.click();
  await expect(checklist).toHaveAttribute("aria-pressed", before === "true" ? "false" : "true");
});

test("办事路线费用和备用方案应通过二级入口展开", async ({ page }) => {
  await page.goto("/routes/overseas-payment-card");
  expect(await page.getByText("可能费用", { exact: true }).count()).toBe(0);
  expect(await page.getByText("备用路径", { exact: true }).count()).toBe(0);
  await page.getByRole("button", { name: "查看费用说明" }).click();
  await expect(page.getByText("可能费用", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "查看备用方案" }).click();
  await expect(page.getByText("备用路径", { exact: true })).toBeVisible();
});

test("任务详情提问、备注、经历整理和过时反馈均有闭环", async ({ page }) => {
  const created = await page.request.post("/api/tasks", {
    data: {
      sourceType: "manual",
      sourceId: `detail-${Date.now()}`,
      title: "任务详情交互测试",
      steps: [{ title: "核验材料" }],
    },
  });
  const { task } = (await created.json()) as { task: { id: string } };
  await page.goto(`/tasks/${task.id}`);
  await expect(page.getByRole("link", { name: "问 AI" })).toHaveAttribute("href", "/ask");

  const stepButton = page.getByRole("button", { name: /核验材料/ });
  await expect(stepButton).toBeVisible();
  if ((await stepButton.getAttribute("aria-expanded")) !== "true") await stepButton.click();
  const note = page.getByLabel("任务备注");
  await expect(note).toBeVisible();
  await note.fill("已经电话核验");
  await page.reload();
  const reloadedStepButton = page.getByRole("button", { name: /核验材料/ });
  await expect(reloadedStepButton).toBeVisible();
  if ((await reloadedStepButton.getAttribute("aria-expanded")) !== "true") await reloadedStepButton.click();
  await expect(page.getByLabel("任务备注")).toHaveValue("已经电话核验");

  await page.getByRole("button", { name: "AI 帮我整理" }).click();
  await expect(page.getByRole("status")).toContainText("请先写下");
  await page.getByLabel("分享你的经历").fill("材料比清单多一项");
  await page.getByRole("button", { name: "AI 帮我整理" }).click();
  await expect(page.getByLabel("分享你的经历")).toHaveValue(/我的办理经历/);
  await page.getByRole("button", { name: "报告过时信息" }).click();
  await expect(page.getByText("已记录反馈")).toBeVisible();
});

test("页面响应包含基础安全标头", async ({ request }) => {
  const response = await request.get("/");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(response.headers()["permissions-policy"]).toContain("camera=()");
  expect(response.headers()["x-powered-by"]).toBeUndefined();
});

test("任务状态筛选不刷新页面且只展示对应状态", async ({ page }) => {
  const marker = `筛选任务 ${Date.now()}`;
  const created = await page.request.post("/api/tasks", {
    data: { sourceType: "manual", sourceId: marker, title: marker, steps: [{ title: "处理" }] },
  });
  const { task } = (await created.json()) as { task: { id: string } };
  await page.request.patch(`/api/tasks/${task.id}`, { data: { status: "pending" } });

  await page.goto("/tasks");
  const originalUrl = page.url();
  const pendingTab = page.getByRole("tab", { name: /待处理/ });
  await pendingTab.click();
  await expect(pendingTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: marker })).toBeVisible();
  expect(page.url()).toBe(originalUrl);
});

test("不存在的动态资源显示可恢复错误，而不是白屏", async ({ page }) => {
  for (const route of ["/diagnosis/not-found", "/plans/not-found", "/documents/not-found", "/tasks/not-found"]) {
    await page.goto(route);
    await expect(page.getByText(/不存在|无法|失败|出了点问题/).first(), route).toBeVisible();
    await expect(page.locator("body"), route).not.toBeEmpty();
  }
});

for (const route of ["/money-map", "/tasks", "/learn", "/documents/new"] as const) {
  test(`${route} 在 390px 移动端应给正文保留可用宽度`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const mainWidth = await page.locator("main").evaluate(
      (main) => main.getBoundingClientRect().width,
    );
    expect(mainWidth).toBeGreaterThanOrEqual(320);
  });
}
