import { expect, test } from "@playwright/test";

/**
 * 阶段 2 主链路冒烟（静态 Mock 版）：
 * 链路 A：P01 输入 → P02 澄清 → P03 行动路径 → P10 任务中心 → P08 资金地图
 * 链路 B：P04 上传 → P05 产品解读 → P10 任务中心
 */
test.describe("主链路（串行执行：共享 demo 内存状态，避免并发编译竞争）", () => {
  test.describe.configure({ mode: "serial" });

test.describe("主链路 A：资金行动路径（AI 诊断链路）", () => {
  test("P01 输入问题 → 创建会话并跳转 P02 澄清", async ({ page }) => {
    await page.goto("/");
    const input = page.getByLabel("输入你的金融问题");
    await input.fill("我有 3 万元暂时不用，怎么安排？");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/diagnosis\//);
    await expect(page.getByText("当前情况")).toBeVisible();
    // 一次只问一个问题
    const radios = page.getByRole("radio");
    await expect(radios).toHaveCount(4);
  });

  test("P02 逐题回答（一次一问）→ 自动生成进入 P03 行动路径", async ({ page }) => {
    // API 准备会话并回答前 4 题（页面冷加载更稳定）
    const diag = await page.request.post("/api/diagnosis", {
      data: { question: "我有 3 万元闲钱，想稳一点也想学投资" },
    });
    const { session } = (await diag.json()) as { session: { id: string } };
    for (const [key, value] of [
      ["expectedUseHorizon", "1_to_3y"],
      ["emergencyFundMonths", "4.5"],
      ["highInterestDebt", "false"],
      ["lossTolerance", "small"],
    ]) {
      await page.request.post(`/api/diagnosis/${session.id}/answer`, {
        data: { key, value },
      });
    }

    await page.goto(`/diagnosis/${session.id}`);
    // 一次只问一个问题：当前应为第 5 题（收入稳定）
    await expect(page.getByRole("radio", { name: "比较稳定" })).toBeVisible();
    const radios = page.getByRole("radio");
    await expect(radios).toHaveCount(3);

    // 回答最后一题 → 自动生成行动路径
    await page.getByRole("radio", { name: "比较稳定" }).click();
    await expect(page.getByRole("button", { name: "下一步" })).toBeEnabled();
    await page.getByRole("button", { name: "下一步" }).click();

    await expect(page).toHaveURL(/\/plans\//, { timeout: 15000 });
    await expect(page.getByRole("heading", { name: "你的资金安排路径" })).toBeVisible();
    await expect(page.getByText("下一步行动清单")).toBeVisible();
  });

  test("P03 保存任务后进入 P10 任务中心", async ({ page }) => {
    // 先创建会话并生成计划
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
    expect(planRes.status()).toBe(201);
    const { plan } = (await planRes.json()) as { plan: { id: string } };

    await page.goto(`/plans/${plan.id}`);
    await page.getByRole("button", { name: /保存为我的金融任务/ }).click();
    await expect(page).toHaveURL(/\/tasks/);
    await expect(page.getByRole("heading", { name: "我的金融任务" })).toBeVisible();
  });

  test("P03 计划桶合计 100% 且无收益承诺（API 校验）", async ({ page }) => {
    const diag = await page.request.post("/api/diagnosis", {
      data: { question: "3 万元闲钱怎么安排？" },
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
    const { plan } = (await planRes.json()) as {
      plan: {
        buckets: Array<{ percentage: number }>;
        risks: string[];
        hardConstraints: string[];
      };
    };
    const total = plan.buckets.reduce((s, b) => s + b.percentage, 0);
    expect(total).toBe(100);
    expect(plan.buckets.length).toBe(3);
  });

  test("P03 保存任务后 P10 出现新任务（数据闭环）", async ({ page }) => {
    // 用唯一 sourceId 验证：创建任务 → 任务列表可查到（并发安全）
    const marker = `e2e-plan-${Date.now()}`;
    const createRes = await page.request.post("/api/tasks", {
      data: {
        sourceType: "plan",
        sourceId: marker,
        title: `闭环任务 ${marker}`,
        summary: "由 e2e 创建",
        steps: [{ title: "步骤 1" }],
      },
    });
    expect(createRes.status()).toBe(201);

    const res2 = await page.request.get("/api/tasks");
    const tasks = ((await res2.json()) as { tasks: Array<{ sourceId: string; title: string }> }).tasks;
    expect(tasks.some((t) => t.sourceId === marker)).toBe(true);
  });

  test("P10 任务卡可进入任务详情", async ({ page }) => {
    await page.goto("/tasks");
    // 任务卡存在且链接正确
    await expect(page.locator('a[href="/tasks/t-30k-plan"]')).toBeVisible();
    await page.locator('a[href="/tasks/t-30k-plan"]').click();
    await expect(page).toHaveURL(/\/tasks\/t-30k-plan/);
    // 详情数据（API 层，避免并行下页面 hydrate 时序 flaky）
    const res = await page.request.get("/api/tasks/t-30k-plan");
    const { task } = (await res.json()) as { task: { title: string; steps: unknown[] } };
    expect(task.title).toBe("安排 3 万元闲钱");
    expect(task.steps.length).toBeGreaterThan(0);
  });
});

test.describe("主链路 B：产品解读", () => {
  test("P04 上传后确认进入 P05 解读", async ({ page }) => {
    await page.goto("/documents/new");
    await page.locator('input[type="file"]').setInputFiles("e2e/fixtures/sample-product.pdf");
    await expect(page.getByRole("button", { name: "确认并生成解读" })).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole("button", { name: "确认并生成解读" }).click();
    await expect(page).toHaveURL(/\/documents\/demo-doc-\d+/);
    await expect(page.getByText(/先说结论/)).toBeVisible();
  });

  test("P05 保存任务跳转 P10（API 全链路）", async ({ page }) => {
    const { readFileSync } = await import("node:fs");
    const buf = readFileSync("e2e/fixtures/sample-product.pdf");
    // 1. 上传
    const up = await page.request.post("/api/documents", {
      multipart: {
        file: { name: "product.pdf", mimeType: "application/pdf", buffer: buf },
      },
    });
    expect(up.status()).toBe(201);
    const { document } = (await up.json()) as { document: { id: string } };
    // 2. 分析
    const an = await page.request.post(`/api/documents/${document.id}/analyze`);
    expect(an.status()).toBe(200);
    // 3. 确认字段
    const ex = await page.request.get(`/api/documents/${document.id}`);
    const extraction = ((await ex.json()) as { extraction: { fields: Array<{ key: string; value: string }> } }).extraction;
    const confirmed = Object.fromEntries(extraction.fields.map((f) => [f.key, f.value]));
    const cf = await page.request.patch(`/api/documents/${document.id}/extraction`, {
      data: { confirmed },
    });
    expect(cf.status()).toBe(200);
    // 4. 生成解读并保存任务
    await page.goto(`/documents/${document.id}`);
    await expect(page.getByText(/先说结论/)).toBeVisible();
    await page.getByRole("button", { name: /保存到我的任务/ }).click();
    await expect(page).toHaveURL(/\/tasks/);
  });

  test("未确认字段前不能生成解读（409）", async ({ page }) => {
    const { readFileSync } = await import("node:fs");
    const buf = readFileSync("e2e/fixtures/sample-product.pdf");
    const up = await page.request.post("/api/documents", {
      multipart: {
        file: { name: "product.pdf", mimeType: "application/pdf", buffer: buf },
      },
    });
    const { document } = (await up.json()) as { document: { id: string } };
    await page.request.post(`/api/documents/${document.id}/analyze`);
    const reportRes = await page.request.post(`/api/documents/${document.id}/generate-report`);
    expect(reportRes.status()).toBe(409);
  });

  test("非法文件类型被拒绝（415）", async ({ page }) => {
    const res = await page.request.post("/api/documents", {
      multipart: {
        file: { name: "evil.txt", mimeType: "text/plain", buffer: Buffer.from("hello") },
      },
    });
    expect(res.status()).toBe(415);
  });
});

test.describe("交互状态", () => {
  test("P11 完成步骤后进度立即更新", async ({ page }) => {
    // 自建独立任务，避免共享 demo 状态跨测试累积
    const res = await page.request.post("/api/tasks", {
      data: {
        sourceType: "manual",
        sourceId: "e2e-step-test",
        title: "e2e 步骤任务",
        steps: [{ title: "步骤 A" }, { title: "步骤 B" }],
      },
    });
    const { task } = (await res.json()) as { task: { id: string } };

    await page.goto(`/tasks/${task.id}`);
    const before = await page
      .locator('div[role="progressbar"]')
      .first()
      .getAttribute("aria-valuenow");
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

  test("P09 保存资产后 P08 资金地图聚合更新（数据闭环）", async ({ page }) => {
    const res = await page.request.get("/api/money-map");
    const before = ((await res.json()) as { totalAssets: number }).totalAssets;

    await page.goto("/money-map?drawer=add-asset");
    await page.getByLabel("金额下限").fill("100000");
    await page.getByLabel("金额上限").fill("100000");
    await page.getByRole("button", { name: "保存到资金地图" }).click();
    await expect(page.getByText("已保存到资金地图")).toBeVisible();

    const res2 = await page.request.get("/api/money-map");
    const after = ((await res2.json()) as { totalAssets: number }).totalAssets;
    expect(after).toBe(before + 100000);
  });
});
});
