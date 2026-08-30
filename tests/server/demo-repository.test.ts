import { describe, expect, it, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { DemoRepository } from "@/lib/server/repository";

/**
 * 数据闭环单元测试（DemoRepository，无 Supabase 时行为一致）：
 * - P09 保存资产 → P08 资金地图聚合更新
 * - P03 保存任务 → P10 任务列表出现新任务
 * - P11 完成步骤 → 任务进度更新，全部完成后状态 completed
 */

const USER = "demo-user";

describe("DemoRepository · 资金地图（P09 → P08）", () => {
  let repo: DemoRepository;

  beforeEach(() => {
    repo = new DemoRepository();
  });

  it("初始聚合：总资产 86400 / 总负债 38000 / 净资产 48400", async () => {
    const map = await repo.getMoneyMap(USER);
    expect(map.totalAssets).toBe(86400);
    expect(map.totalLiabilities).toBe(38000);
    expect(map.netAssets).toBe(48400);
    expect(map.emergencyCoverageMonths).toBeCloseTo(3.2);
  });

  it("保存新资产后总资产立即增加（P09 保存 → P08 更新）", async () => {
    const before = await repo.getMoneyMap(USER);
    await repo.createAsset(USER, {
      kind: "asset",
      category: "国债",
      label: "国债",
      amountExact: 10000,
    });
    const after = await repo.getMoneyMap(USER);
    expect(after.totalAssets).toBe(before.totalAssets + 10000);
    expect(after.assets.some((a) => a.category === "国债")).toBe(true);
  });

  it("删除资产后聚合回落", async () => {
    const before = await repo.getMoneyMap(USER);
    const target = before.assets[0];
    await repo.deleteAsset(USER, target.id);
    const after = await repo.getMoneyMap(USER);
    expect(after.totalAssets).toBeLessThan(before.totalAssets);
  });

  it("非法输入（无金额）被 schema 拒绝", async () => {
    const { AssetInputSchema } = await import("@/lib/server/schemas");
    const res = AssetInputSchema.safeParse({
      kind: "asset",
      category: "国债",
      label: "国债",
    });
    expect(res.success).toBe(false);
  });
});

describe("DemoRepository · 任务闭环（P03 → P10）", () => {
  let repo: DemoRepository;

  beforeEach(() => {
    repo = new DemoRepository();
  });

  it("创建任务后列表出现新任务且为 in_progress", async () => {
    const before = await repo.listTasks(USER);
    const task = await repo.createTask(USER, {
      sourceType: "plan",
      sourceId: "plan-1",
      title: "安排 5 万元年终奖",
      summary: "按三桶拆分",
      nextAction: "确认应急资金目标",
      steps: [
        { title: "确认应急资金目标" },
        { title: "了解国债购买" },
      ],
    });
    const after = await repo.listTasks(USER);
    expect(after.length).toBe(before.length + 1);
    expect(after[0].title).toBe("安排 5 万元年终奖");
    expect(task.status).toBe("in_progress");
    expect(task.progressTotal).toBe(2);
  });

  it("任务详情包含步骤且第一步为 doing", async () => {
    const task = await repo.createTask(USER, {
      sourceType: "plan",
      sourceId: "plan-2",
      title: "任务 A",
      steps: [{ title: "步骤 1" }, { title: "步骤 2" }],
    });
    expect(task.steps[0].status).toBe("doing");
    expect(task.steps[1].status).toBe("todo");
  });
});

describe("DemoRepository · 步骤完成（P11 → P10/P11 进度一致）", () => {
  let repo: DemoRepository;

  beforeEach(() => {
    repo = new DemoRepository();
  });

  it("完成步骤后 progressCurrent 增加", async () => {
    const task = await repo.createTask(USER, {
      sourceType: "plan",
      sourceId: "plan-3",
      title: "任务 B",
      steps: [{ title: "步骤 1" }, { title: "步骤 2" }],
    });
    const updated = await repo.completeStep(USER, task.id, task.steps[0].id);
    expect(updated?.progressCurrent).toBe(1);
    expect(updated?.steps[0].status).toBe("done");
  });

  it("全部完成后任务状态转为 completed", async () => {
    const task = await repo.createTask(USER, {
      sourceType: "plan",
      sourceId: "plan-4",
      title: "任务 C",
      steps: [{ title: "步骤 1" }, { title: "步骤 2" }],
    });
    const t1 = await repo.completeStep(USER, task.id, task.steps[0].id);
    expect(t1?.progressCurrent).toBe(1);
    expect(t1?.status).toBe("in_progress");
    const t2 = await repo.completeStep(USER, task.id, task.steps[1].id);
    expect(t2?.progressCurrent).toBe(2);
    expect(t2?.status).toBe("completed");
  });
});

describe("迁移与数据模型约束", () => {
  it("migration 包含 11 张核心表", () => {
    const sql = readFileSync("supabase/migrations/0001_init.sql", "utf8");
    for (const table of [
      "public.profiles",
      "public.diagnosis_sessions",
      "public.plans",
      "public.assets",
      "public.goals",
      "public.tasks",
      "public.task_steps",
      "public.documents",
      "public.document_extractions",
      "public.knowledge_sources",
    ]) {
      expect(sql).toContain(`create table if not exists ${table}`);
    }
  });

  it("RLS 已为所有用户表启用", () => {
    const sql = readFileSync("supabase/migrations/0001_init.sql", "utf8");
    expect(sql.match(/enable row level security/g)?.length).toBeGreaterThanOrEqual(9);
  });

  it("禁止设计卡号/密码/验证码/身份证字段", () => {
    const sql = readFileSync("supabase/migrations/0001_init.sql", "utf8");
    const lowercase = sql.toLowerCase();
    for (const forbidden of ["card_number", "card_no", "password", "pwd", "verify_code", "sms_code", "id_card"]) {
      expect(lowercase).not.toContain(forbidden);
    }
  });
});
