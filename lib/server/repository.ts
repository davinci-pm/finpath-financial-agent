import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  MOCK_GOALS,
  MOCK_LIABILITIES,
  MOCK_ASSETS,
  MOCK_TASKS,
} from "@/lib/mock-data";
import type {
  Asset,
  DiagnosisRecord,
  DocumentField,
  ExtractionRecord,
  Goal,
  MoneyMap,
  PlanRecord,
  ScenarioType,
  Task,
  TaskStatus,
  TaskStep,
  TaskStepStatus,
} from "@/lib/types";

/**
 * FinPath 数据仓库接口。
 * 实现：SupabaseRepository（生产）/ DemoRepository（无凭据时，明确标记）。
 */

/* ============ 领域类型 ↔ DB 行类型 ============ */

type AssetRow = {
  id: string;
  kind: "asset" | "liability" | "goal";
  category: string;
  label: string;
  amount_min: number | null;
  amount_max: number | null;
  amount_exact: number | null;
  currency: string;
  purpose: string | null;
  maturity_date: string | null;
  liquidity: string | null;
  note: string | null;
};

type GoalRow = {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
};

type TaskRow = {
  id: string;
  source_type: string;
  source_id: string | null;
  title: string;
  status: TaskStatus;
  progress_current: number;
  progress_total: number;
  next_action: string | null;
  summary: string | null;
  updated_at: string;
};

type TaskStepRow = {
  id: string;
  task_id: string;
  position: number;
  title: string;
  description: string | null;
  status: TaskStepStatus;
  estimated_minutes: number | null;
  checklist_json: unknown;
  official_entry: string | null;
};

export const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

/** 估算月均生活支出（元），用于应急覆盖月数估算；后续可由用户填写 */
const ESTIMATED_MONTHLY_SPEND = 7500;

const toAsset = (r: AssetRow): Asset => ({
  id: r.id,
  kind: r.kind,
  category: r.category,
  label: r.label,
  amountMin: r.amount_min ?? undefined,
  amountMax: r.amount_max ?? undefined,
  amountExact: r.amount_exact ?? undefined,
  currency: r.currency as Asset["currency"],
  purpose: r.purpose ?? undefined,
  maturityDate: r.maturity_date ?? undefined,
  liquidity: r.liquidity ?? undefined,
  note: r.note ?? undefined,
});

const toGoal = (r: GoalRow): Goal => {
  const progress =
    r.target_amount > 0 ? Math.round((r.current_amount / r.target_amount) * 100) : 0;
  return {
    id: r.id,
    title: r.title,
    targetAmount: r.target_amount,
    currentAmount: r.current_amount,
    targetDate: r.target_date ?? undefined,
    progress,
  };
};

const toTaskStep = (r: TaskStepRow): TaskStep => ({
  id: r.id,
  position: r.position,
  title: r.title,
  description: r.description ?? undefined,
  status: r.status,
  estimatedMinutes: r.estimated_minutes ?? undefined,
  officialEntry: r.official_entry ?? undefined,
});

const toTask = (r: TaskRow, steps: TaskStep[]): Task => ({
  id: r.id,
  sourceType: r.source_type as Task["sourceType"],
  sourceId: r.source_id ?? "",
  title: r.title,
  status: r.status,
  progressCurrent: r.progress_current,
  progressTotal: r.progress_total,
  nextAction: r.next_action ?? "继续任务",
  summary: r.summary ?? undefined,
  steps,
  updatedAt: r.updated_at,
  sourceValid: true,
});

/* ============ Repository 接口 ============ */

export type CreateAssetInput = {
  kind: "asset" | "liability" | "goal";
  category: string;
  label: string;
  amountMin?: number;
  amountMax?: number;
  amountExact?: number;
  currency?: "CNY";
  purpose?: string;
  maturityDate?: string;
  liquidity?: string;
  note?: string;
};

export type CreateTaskInput = {
  sourceType: Task["sourceType"];
  sourceId: string;
  title: string;
  summary?: string;
  nextAction?: string;
  steps?: Array<{ title: string; description?: string; estimatedMinutes?: number }>;
};

export type CreatePlanInput = {
  sessionId: string;
  conclusion: string;
  summary: string;
  hardConstraints: string[];
  buckets: PlanRecord["buckets"];
  actionItems: PlanRecord["actionItems"];
  risks: string[];
  sourceIds: string[];
  disclaimer: string;
  rationale: string[];
};

export type DocumentRecord = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  status: "uploading" | "analyzing" | "awaiting_confirmation" | "ready" | "failed";
  createdAt: string;
};

export type CreateDocumentInput = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
};

/**
 * 文档字段提取的 Schema 级结构（对齐手册 §11.2）
 * 来源类型：file 文件原文 / ai AI 推断 / unknown 未识别
 */
export const DOCUMENT_FIELD_KEYS = [
  "name",
  "type",
  "term",
  "yield",
  "risk",
  "guaranteed",
  "early_exit",
  "fees",
  "min_purchase",
] as const;

export interface FinPathRepository {
  /* 资金地图 */
  getMoneyMap(userId: string): Promise<MoneyMap>;

  /* 资产 */
  listAssets(userId: string): Promise<Asset[]>;
  createAsset(userId: string, input: CreateAssetInput): Promise<Asset>;
  updateAsset(
    userId: string,
    id: string,
    input: Partial<CreateAssetInput>,
  ): Promise<Asset | null>;
  deleteAsset(userId: string, id: string): Promise<boolean>;

  /* 任务 */
  listTasks(userId: string): Promise<Task[]>;
  getTask(userId: string, id: string): Promise<Task | null>;
  createTask(userId: string, input: CreateTaskInput): Promise<Task>;
  updateTaskStatus(userId: string, id: string, status: TaskStatus): Promise<Task | null>;
  completeStep(userId: string, taskId: string, stepId: string): Promise<Task | null>;

  /* 诊断会话（阶段 4） */
  createDiagnosisSession(
    userId: string,
    input: { rawQuestion: string; scenarioType: ScenarioType },
  ): Promise<DiagnosisRecord>;
  getDiagnosisSession(userId: string, id: string): Promise<DiagnosisRecord | null>;
  updateDiagnosisSession(
    userId: string,
    id: string,
    patch: {
      answers?: Record<string, string>;
      currentQuestionKey?: string | null;
      status?: "clarifying" | "completed";
    },
  ): Promise<DiagnosisRecord | null>;

  /* 计划（阶段 4） */
  createPlan(userId: string, input: CreatePlanInput): Promise<PlanRecord>;
  getPlan(userId: string, id: string): Promise<PlanRecord | null>;

  /* 文档（阶段 5） */
  createDocument(userId: string, input: CreateDocumentInput): Promise<DocumentRecord>;
  getDocument(userId: string, id: string): Promise<DocumentRecord | null>;
  getDocumentBuffer(userId: string, id: string): Promise<Buffer | null>;
  updateDocumentStatus(
    userId: string,
    id: string,
    status: DocumentRecord["status"],
  ): Promise<DocumentRecord | null>;
  saveExtraction(
    userId: string,
    docId: string,
    fields: DocumentField[],
  ): Promise<ExtractionRecord>;
  getExtraction(userId: string, docId: string): Promise<ExtractionRecord | null>;
  confirmExtraction(
    userId: string,
    docId: string,
    confirmed: Record<string, string>,
  ): Promise<ExtractionRecord>;
}

/* ============ DemoRepository（无凭据回退，明确标记） ============ */

function assetAmount(a: Asset): number {
  if (a.amountExact != null) return a.amountExact;
  if (a.amountMin != null && a.amountMax != null) return Math.round((a.amountMin + a.amountMax) / 2);
  return 0;
}

export class DemoRepository implements FinPathRepository {
  private readonly label = "DemoRepository(no-supabase)";
  private assets: Asset[] = structuredClone(MOCK_ASSETS);
  private liabilities: Asset[] = structuredClone(MOCK_LIABILITIES);
  private goals: Goal[] = structuredClone(MOCK_GOALS);
  private tasks: Task[] = structuredClone(MOCK_TASKS);
  private assetSeq = 1000;
  private taskSeq = 2000;

  constructor() {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[${this.label}] 未检测到 Supabase 凭据，使用内存数据（仅开发/演示）。`);
    }
  }

  async getMoneyMap(_userId: string): Promise<MoneyMap> {
    void _userId; // Demo 模式不校验用户隔离
    const assets = this.assets.filter((a) => a.kind === "asset");
    const liabilities = this.liabilities;
    const totalAssets = assets.reduce((s, a) => s + assetAmount(a), 0);
    const totalLiabilities = liabilities.reduce((s, a) => s + assetAmount(a), 0);
    const cash = assets
      .filter((a) => a.category === "现金与活期")
      .reduce((s, a) => s + assetAmount(a), 0);
    const emergencyCoverageMonths = Math.round((cash / ESTIMATED_MONTHLY_SPEND) * 10) / 10;
    return {
      totalAssets,
      totalLiabilities,
      netAssets: totalAssets - totalLiabilities,
      emergencyCoverageMonths,
      assets,
      liabilities,
      goals: this.goals,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
  }

  async listAssets(_userId: string): Promise<Asset[]> {
    void _userId; // Demo 模式不校验用户隔离
    return [...this.assets, ...this.liabilities].filter((a) => a.kind === "asset" || a.kind === "liability");
  }

  async createAsset(_userId: string, input: CreateAssetInput): Promise<Asset> {
    void _userId; // Demo 模式不校验用户隔离
    const asset: Asset = {
      id: `demo-asset-${++this.assetSeq}`,
      kind: input.kind,
      category: input.category,
      label: input.label,
      amountMin: input.amountMin,
      amountMax: input.amountMax,
      amountExact: input.amountExact,
      currency: "CNY",
      purpose: input.purpose,
      maturityDate: input.maturityDate,
      liquidity: input.liquidity,
      note: input.note,
    };
    if (input.kind === "liability") this.liabilities.push(asset);
    else if (input.kind === "goal") {
      const goal: Goal = {
        id: asset.id,
        title: input.label,
        targetAmount: input.amountExact ?? input.amountMax ?? 0,
        currentAmount: 0,
        progress: 0,
      };
      this.goals.push(goal);
    } else {
      this.assets.push(asset);
    }
    return asset;
  }

  async updateAsset(
    userId: string,
    id: string,
    input: Partial<CreateAssetInput>,
  ): Promise<Asset | null> {
    const pool = [...this.assets, ...this.liabilities];
    const idx = pool.findIndex((a) => a.id === id);
    if (idx < 0) return null;
    const target = pool[idx];
    Object.assign(target, input);
    return target;
  }

  async deleteAsset(_userId: string, id: string): Promise<boolean> {
    void _userId; // Demo 模式不校验用户隔离
    const before = this.assets.length + this.liabilities.length;
    this.assets = this.assets.filter((a) => a.id !== id);
    this.liabilities = this.liabilities.filter((a) => a.id !== id);
    return this.assets.length + this.liabilities.length < before;
  }

  async listTasks(_userId: string): Promise<Task[]> {
    void _userId; // Demo 模式不校验用户隔离
    return [...this.tasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getTask(_userId: string, id: string): Promise<Task | null> {
    void _userId; // Demo 模式不校验用户隔离
    return this.tasks.find((t) => t.id === id) ?? null;
  }

  async createTask(_userId: string, input: CreateTaskInput): Promise<Task> {
    void _userId; // Demo 模式不校验用户隔离
    const steps: TaskStep[] = (input.steps ?? []).map((s, i) => ({
      id: `demo-step-${++this.assetSeq}`,
      position: i + 1,
      title: s.title,
      description: s.description,
      status: i === 0 ? "doing" : "todo",
      estimatedMinutes: s.estimatedMinutes,
    }));
    const task: Task = {
      id: `demo-task-${++this.taskSeq}`,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      title: input.title,
      status: "in_progress",
      progressCurrent: 0,
      progressTotal: steps.length || 1,
      nextAction: input.nextAction ?? steps[0]?.title ?? "开始任务",
      summary: input.summary,
      steps,
      updatedAt: new Date().toISOString().slice(0, 10),
      sourceValid: true,
    };
    this.tasks.unshift(task);
    return task;
  }

  async updateTaskStatus(
    userId: string,
    id: string,
    status: TaskStatus,
  ): Promise<Task | null> {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return null;
    task.status = status;
    task.updatedAt = new Date().toISOString().slice(0, 10);
    return task;
  }

  async completeStep(
    userId: string,
    taskId: string,
    stepId: string,
  ): Promise<Task | null> {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return null;
    const step = task.steps.find((s) => s.id === stepId);
    if (!step) return null;
    step.status = "done";
    task.progressCurrent = task.steps.filter((s) => s.status === "done").length;
    if (task.progressCurrent >= task.progressTotal) task.status = "completed";
    task.updatedAt = new Date().toISOString().slice(0, 10);
    return task;
  }

  /* ===== 诊断会话（阶段 4） ===== */

  private sessions: DiagnosisRecord[] = [];
  private plans: PlanRecord[] = [];
  private sessionSeq = 3000;
  private planSeq = 4000;

  async createDiagnosisSession(
    _userId: string,
    input: { rawQuestion: string; scenarioType: ScenarioType },
  ): Promise<DiagnosisRecord> {
    const now = new Date().toISOString();
    const session: DiagnosisRecord = {
      id: `demo-session-${++this.sessionSeq}`,
      rawQuestion: input.rawQuestion,
      scenarioType: input.scenarioType,
      status: "clarifying",
      currentQuestionKey: null,
      answers: {},
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.unshift(session);
    return session;
  }

  async getDiagnosisSession(
    _userId: string,
    id: string,
  ): Promise<DiagnosisRecord | null> {
    return this.sessions.find((s) => s.id === id) ?? null;
  }

  async updateDiagnosisSession(
    _userId: string,
    id: string,
    patch: {
      answers?: Record<string, string>;
      currentQuestionKey?: string | null;
      status?: "clarifying" | "completed";
    },
  ): Promise<DiagnosisRecord | null> {
    const session = this.sessions.find((s) => s.id === id);
    if (!session) return null;
    if (patch.answers) session.answers = { ...session.answers, ...patch.answers };
    if (patch.currentQuestionKey !== undefined) session.currentQuestionKey = patch.currentQuestionKey;
    if (patch.status) session.status = patch.status;
    session.updatedAt = new Date().toISOString();
    return session;
  }

  async createPlan(_userId: string, input: CreatePlanInput): Promise<PlanRecord> {
    const now = new Date().toISOString();
    const plan: PlanRecord = {
      id: `demo-plan-${++this.planSeq}`,
      sessionId: input.sessionId,
      conclusion: input.conclusion,
      summary: input.summary,
      hardConstraints: input.hardConstraints,
      buckets: input.buckets,
      actionItems: input.actionItems,
      risks: input.risks,
      sourceIds: input.sourceIds,
      disclaimer: input.disclaimer,
      rationale: input.rationale,
      updatedAt: now,
    };
    this.plans.unshift(plan);
    return plan;
  }

  async getPlan(_userId: string, id: string): Promise<PlanRecord | null> {
    return this.plans.find((p) => p.id === id) ?? null;
  }

  /* ===== 文档（阶段 5） ===== */

  private documents: DocumentRecord[] = [];
  private extractions: ExtractionRecord[] = [];
  private buffers = new Map<string, Buffer>();
  private docSeq = 5000;

  async createDocument(
    _userId: string,
    input: CreateDocumentInput,
  ): Promise<DocumentRecord> {
    const doc: DocumentRecord = {
      id: `demo-doc-${++this.docSeq}`,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      status: "uploading",
      createdAt: new Date().toISOString(),
    };
    this.documents.unshift(doc);
    this.buffers.set(doc.id, input.buffer);
    return doc;
  }

  async getDocument(_userId: string, id: string): Promise<DocumentRecord | null> {
    return this.documents.find((d) => d.id === id) ?? null;
  }

  async getDocumentBuffer(_userId: string, id: string): Promise<Buffer | null> {
    return this.buffers.get(id) ?? null;
  }

  async updateDocumentStatus(
    _userId: string,
    id: string,
    status: DocumentRecord["status"],
  ): Promise<DocumentRecord | null> {
    const doc = this.documents.find((d) => d.id === id);
    if (!doc) return null;
    doc.status = status;
    return doc;
  }

  async saveExtraction(
    _userId: string,
    docId: string,
    fields: DocumentField[],
  ): Promise<ExtractionRecord> {
    const now = new Date().toISOString();
    const existing = this.extractions.find((e) => e.documentId === docId);
    if (existing) {
      existing.fields = fields;
      existing.status = "extracted";
      existing.confirmedFields = {};
      existing.updatedAt = now;
      return existing;
    }
    const rec: ExtractionRecord = {
      documentId: docId,
      fields,
      confirmedFields: {},
      status: "extracted",
      createdAt: now,
      updatedAt: now,
    };
    this.extractions.push(rec);
    const doc = this.documents.find((d) => d.id === docId);
    if (doc) doc.status = "awaiting_confirmation";
    return rec;
  }

  async getExtraction(
    _userId: string,
    docId: string,
  ): Promise<ExtractionRecord | null> {
    return this.extractions.find((e) => e.documentId === docId) ?? null;
  }

  async confirmExtraction(
    _userId: string,
    docId: string,
    confirmed: Record<string, string>,
  ): Promise<ExtractionRecord> {
    const rec = this.extractions.find((e) => e.documentId === docId);
    if (!rec) throw new Error(`extraction 不存在: ${docId}`);
    rec.confirmedFields = confirmed;
    rec.status = "confirmed";
    rec.updatedAt = new Date().toISOString();
    const doc = this.documents.find((d) => d.id === docId);
    if (doc) doc.status = "ready";
    return rec;
  }
}

/* ============ SupabaseRepository（生产） ============ */

export class SupabaseRepository implements FinPathRepository {
  private readonly label = "SupabaseRepository";
  private client: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>;

  constructor(client: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>) {
    this.client = client;
  }

  async getMoneyMap(userId: string): Promise<MoneyMap> {
    const [{ data: assets }, { data: liabilities }, { data: goals }] = await Promise.all([
      this.client.from("assets").select("*").eq("user_id", userId).eq("kind", "asset"),
      this.client.from("assets").select("*").eq("user_id", userId).eq("kind", "liability"),
      this.client.from("goals").select("*").eq("user_id", userId),
    ]);
    const a = (assets ?? []) as unknown as AssetRow[];
    const l = (liabilities ?? []) as unknown as AssetRow[];
    const g = (goals ?? []) as unknown as GoalRow[];

    const totalAssets = a.reduce((s, r) => s + (r.amount_exact ?? Math.round(((r.amount_min ?? 0) + (r.amount_max ?? 0)) / 2)), 0);
    const totalLiabilities = l.reduce((s, r) => s + (r.amount_exact ?? Math.round(((r.amount_min ?? 0) + (r.amount_max ?? 0)) / 2)), 0);
    const cash = a
      .filter((r) => r.category === "现金与活期")
      .reduce((s, r) => s + (r.amount_exact ?? Math.round(((r.amount_min ?? 0) + (r.amount_max ?? 0)) / 2)), 0);

    return {
      totalAssets,
      totalLiabilities,
      netAssets: totalAssets - totalLiabilities,
      emergencyCoverageMonths: Math.round((cash / ESTIMATED_MONTHLY_SPEND) * 10) / 10,
      assets: a.map(toAsset),
      liabilities: l.map(toAsset),
      goals: g.map(toGoal),
      updatedAt: new Date().toISOString().slice(0, 10),
    };
  }

  async listAssets(userId: string): Promise<Asset[]> {
    const { data } = await this.client
      .from("assets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    return ((data ?? []) as unknown as AssetRow[]).map(toAsset);
  }

  async createAsset(userId: string, input: CreateAssetInput): Promise<Asset> {
    const { data, error } = await this.client
      .from("assets")
      .insert({
        user_id: userId,
        kind: input.kind,
        category: input.category,
        label: input.label,
        amount_min: input.amountMin ?? null,
        amount_max: input.amountMax ?? null,
        amount_exact: input.amountExact ?? null,
        currency: input.currency ?? "CNY",
        purpose: input.purpose ?? null,
        maturity_date: input.maturityDate ?? null,
        liquidity: input.liquidity ?? null,
        note: input.note ?? null,
      })
      .select()
      .single();
    if (error || !data) throw new Error(`createAsset 失败: ${error?.message}`);
    return toAsset(data as unknown as AssetRow);
  }

  async updateAsset(
    userId: string,
    id: string,
    input: Partial<CreateAssetInput>,
  ): Promise<Asset | null> {
    const patch: Record<string, unknown> = {};
    if (input.category !== undefined) patch.category = input.category;
    if (input.label !== undefined) patch.label = input.label;
    if (input.amountMin !== undefined) patch.amount_min = input.amountMin;
    if (input.amountMax !== undefined) patch.amount_max = input.amountMax;
    if (input.amountExact !== undefined) patch.amount_exact = input.amountExact;
    if (input.purpose !== undefined) patch.purpose = input.purpose;
    if (input.maturityDate !== undefined) patch.maturity_date = input.maturityDate;
    if (input.liquidity !== undefined) patch.liquidity = input.liquidity;
    if (input.note !== undefined) patch.note = input.note;
    const { data, error } = await this.client
      .from("assets")
      .update(patch)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw new Error(`updateAsset 失败: ${error.message}`);
    return data ? toAsset(data as unknown as AssetRow) : null;
  }

  async deleteAsset(userId: string, id: string): Promise<boolean> {
    const { error, count } = await this.client
      .from("assets")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw new Error(`deleteAsset 失败: ${error.message}`);
    return (count ?? 0) > 0;
  }

  private async loadSteps(taskId: string): Promise<TaskStep[]> {
    const { data } = await this.client
      .from("task_steps")
      .select("*")
      .eq("task_id", taskId)
      .order("position", { ascending: true });
    return ((data ?? []) as unknown as TaskStepRow[]).map(toTaskStep);
  }

  async listTasks(userId: string): Promise<Task[]> {
    const { data } = await this.client
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    const rows = (data ?? []) as unknown as TaskRow[];
    return Promise.all(rows.map(async (r) => toTask(r, await this.loadSteps(r.id))));
  }

  async getTask(userId: string, id: string): Promise<Task | null> {
    const { data } = await this.client
      .from("tasks")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (!data) return null;
    const row = data as unknown as TaskRow;
    return toTask(row, await this.loadSteps(row.id));
  }

  async createTask(userId: string, input: CreateTaskInput): Promise<Task> {
    const { data: taskData, error } = await this.client
      .from("tasks")
      .insert({
        user_id: userId,
        source_type: input.sourceType,
        source_id: input.sourceId,
        title: input.title,
        status: "in_progress",
        progress_current: 0,
        progress_total: input.steps?.length ?? 1,
        next_action: input.nextAction ?? input.steps?.[0]?.title ?? "开始任务",
        summary: input.summary ?? null,
      })
      .select()
      .single();
    if (error || !taskData) throw new Error(`createTask 失败: ${error?.message}`);
    const taskRow = taskData as unknown as TaskRow;

    if (input.steps?.length) {
      const { error: stepError } = await this.client.from("task_steps").insert(
        input.steps.map((s, i) => ({
          task_id: taskRow.id,
          position: i + 1,
          title: s.title,
          description: s.description ?? null,
          status: i === 0 ? "doing" : "todo",
          estimated_minutes: s.estimatedMinutes ?? null,
        })),
      );
      if (stepError) throw new Error(`createTask steps 失败: ${stepError.message}`);
    }
    return this.getTask(userId, taskRow.id) as Promise<Task>;
  }

  async updateTaskStatus(
    userId: string,
    id: string,
    status: TaskStatus,
  ): Promise<Task | null> {
    const { data, error } = await this.client
      .from("tasks")
      .update({ status })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw new Error(`updateTaskStatus 失败: ${error.message}`);
    if (!data) return null;
    return toTask(data as unknown as TaskRow, await this.loadSteps(id));
  }

  async completeStep(
    userId: string,
    taskId: string,
    stepId: string,
  ): Promise<Task | null> {
    // 校验任务归属
    const task = await this.getTask(userId, taskId);
    if (!task) return null;
    const step = task.steps.find((s) => s.id === stepId);
    if (!step) return null;

    const { error: stepError } = await this.client
      .from("task_steps")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .eq("id", stepId)
      .eq("task_id", taskId);
    if (stepError) throw new Error(`completeStep step 失败: ${stepError.message}`);

    const doneCount = task.steps.filter((s) => s.id === stepId || s.status === "done").length;
    const allDone = doneCount >= task.progressTotal;
    const { data, error } = await this.client
      .from("tasks")
      .update({
        progress_current: doneCount,
        status: allDone ? "completed" : "in_progress",
      })
      .eq("id", taskId)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw new Error(`completeStep task 失败: ${error.message}`);
    if (!data) return null;
    return toTask(data as unknown as TaskRow, await this.loadSteps(taskId));
  }

  /* ===== 诊断会话（阶段 4） ===== */

  async createDiagnosisSession(
    userId: string,
    input: { rawQuestion: string; scenarioType: ScenarioType },
  ): Promise<DiagnosisRecord> {
    const { data, error } = await this.client
      .from("diagnosis_sessions")
      .insert({
        user_id: userId,
        raw_question: input.rawQuestion,
        scenario_type: input.scenarioType,
        status: "clarifying",
        answers_json: {},
      })
      .select()
      .single();
    if (error || !data) throw new Error(`createDiagnosisSession 失败: ${error?.message}`);
    const r = data as unknown as {
      id: string;
      raw_question: string;
      scenario_type: string;
      status: string;
      current_question_key: string | null;
      answers_json: Record<string, string>;
      created_at: string;
      updated_at: string;
    };
    return {
      id: r.id,
      rawQuestion: r.raw_question,
      scenarioType: r.scenario_type as ScenarioType,
      status: r.status as DiagnosisRecord["status"],
      currentQuestionKey: r.current_question_key,
      answers: r.answers_json ?? {},
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  async getDiagnosisSession(
    userId: string,
    id: string,
  ): Promise<DiagnosisRecord | null> {
    const { data } = await this.client
      .from("diagnosis_sessions")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (!data) return null;
    const r = data as unknown as {
      id: string;
      raw_question: string;
      scenario_type: string;
      status: string;
      current_question_key: string | null;
      answers_json: Record<string, string>;
      created_at: string;
      updated_at: string;
    };
    return {
      id: r.id,
      rawQuestion: r.raw_question,
      scenarioType: r.scenario_type as ScenarioType,
      status: r.status as DiagnosisRecord["status"],
      currentQuestionKey: r.current_question_key,
      answers: r.answers_json ?? {},
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  async updateDiagnosisSession(
    userId: string,
    id: string,
    patch: {
      answers?: Record<string, string>;
      currentQuestionKey?: string | null;
      status?: "clarifying" | "completed";
    },
  ): Promise<DiagnosisRecord | null> {
    const dbPatch: Record<string, unknown> = {};
    if (patch.answers) dbPatch.answers_json = patch.answers;
    if (patch.currentQuestionKey !== undefined) dbPatch.current_question_key = patch.currentQuestionKey;
    if (patch.status) dbPatch.status = patch.status;
    const { data, error } = await this.client
      .from("diagnosis_sessions")
      .update(dbPatch)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw new Error(`updateDiagnosisSession 失败: ${error.message}`);
    if (!data) return null;
    return this.getDiagnosisSession(userId, id);
  }

  async createPlan(userId: string, input: CreatePlanInput): Promise<PlanRecord> {
    const { data, error } = await this.client
      .from("plans")
      .insert({
        user_id: userId,
        diagnosis_session_id: input.sessionId,
        conclusion: input.conclusion,
        constraints_json: {
          hardConstraints: input.hardConstraints,
          summary: input.summary,
          rationale: input.rationale,
          disclaimer: input.disclaimer,
        },
        allocations_json: input.buckets,
        actions_json: input.actionItems,
        risks_json: input.risks,
        source_ids_json: input.sourceIds,
      })
      .select()
      .single();
    if (error || !data) throw new Error(`createPlan 失败: ${error?.message}`);
    return this.getPlan(userId, (data as { id: string }).id) as Promise<PlanRecord>;
  }

  async getPlan(userId: string, id: string): Promise<PlanRecord | null> {
    const { data } = await this.client
      .from("plans")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (!data) return null;
    const r = data as unknown as {
      id: string;
      diagnosis_session_id: string;
      conclusion: string;
      constraints_json: { hardConstraints?: string[]; summary?: string; rationale?: string[]; disclaimer?: string };
      allocations_json: PlanRecord["buckets"];
      actions_json: PlanRecord["actionItems"];
      risks_json: string[];
      source_ids_json: string[];
      created_at: string;
    };
    return {
      id: r.id,
      sessionId: r.diagnosis_session_id,
      conclusion: r.conclusion,
      summary: r.constraints_json?.summary ?? "",
      hardConstraints: r.constraints_json?.hardConstraints ?? [],
      buckets: r.allocations_json ?? [],
      actionItems: r.actions_json ?? [],
      risks: r.risks_json ?? [],
      sourceIds: r.source_ids_json ?? [],
      disclaimer: r.constraints_json?.disclaimer ?? "行动教育建议，不构成具体投资推荐。",
      rationale: r.constraints_json?.rationale ?? [],
      updatedAt: r.created_at,
    };
  }

  /* ===== 文档（阶段 5） ===== */

  private async ensureBucket() {
    // 幂等创建私有 bucket（忽略已存在错误）
    await this.client.storage
      .createBucket("documents", { public: false })
      .catch(() => {});
  }

  async createDocument(
    userId: string,
    input: CreateDocumentInput,
  ): Promise<DocumentRecord> {
    const { data, error } = await this.client
      .from("documents")
      .insert({
        user_id: userId,
        file_name: input.fileName,
        mime_type: input.mimeType,
        size_bytes: input.sizeBytes,
        status: "uploading",
      })
      .select()
      .single();
    if (error || !data) throw new Error(`createDocument 失败: ${error?.message}`);
    const doc = data as unknown as {
      id: string;
      file_name: string;
      mime_type: string;
      size_bytes: number;
      status: string;
      created_at: string;
    };
    // 私有 Storage 保存（RLS：storage 对象归属 user）
    await this.ensureBucket();
    const path = `${userId}/${doc.id}/${input.fileName}`;
    const { error: uploadError } = await this.client.storage
      .from("documents")
      .upload(path, input.buffer, { contentType: input.mimeType, upsert: false });
    if (uploadError) throw new Error(`Storage 上传失败: ${uploadError.message}`);
    const { data: updated } = await this.client
      .from("documents")
      .update({ storage_path: path })
      .eq("id", doc.id)
      .select()
      .single();
    return {
      id: doc.id,
      fileName: doc.file_name,
      mimeType: doc.mime_type,
      sizeBytes: doc.size_bytes,
      status: (updated as { status: string } | null)?.status as DocumentRecord["status"] ?? "uploading",
      createdAt: doc.created_at,
    };
  }

  async getDocument(userId: string, id: string): Promise<DocumentRecord | null> {
    const { data } = await this.client
      .from("documents")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (!data) return null;
    const r = data as unknown as {
      id: string;
      file_name: string;
      mime_type: string;
      size_bytes: number;
      status: string;
      created_at: string;
    };
    return {
      id: r.id,
      fileName: r.file_name,
      mimeType: r.mime_type,
      sizeBytes: r.size_bytes,
      status: r.status as DocumentRecord["status"],
      createdAt: r.created_at,
    };
  }

  async getDocumentBuffer(userId: string, id: string): Promise<Buffer | null> {
    const doc = await this.getDocument(userId, id);
    if (!doc) return null;
    const { data } = await this.client.storage.from("documents").list(`${userId}/${id}`);
    const obj = data?.[0];
    if (!obj) return null;
    const { data: blob } = await this.client.storage
      .from("documents")
      .download(`${userId}/${id}/${obj.name}`);
    if (!blob) return null;
    return Buffer.from(await blob.arrayBuffer());
  }

  async updateDocumentStatus(
    userId: string,
    id: string,
    status: DocumentRecord["status"],
  ): Promise<DocumentRecord | null> {
    const { data, error } = await this.client
      .from("documents")
      .update({ status })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw new Error(`updateDocumentStatus 失败: ${error.message}`);
    return data ? this.getDocument(userId, id) : null;
  }

  async saveExtraction(
    userId: string,
    docId: string,
    fields: DocumentField[],
  ): Promise<ExtractionRecord> {
    const now = new Date().toISOString();
    const existing = await this.getExtraction(userId, docId);
    if (existing) {
      const { error } = await this.client
        .from("document_extractions")
        .update({ extracted_fields_json: fields as unknown as Record<string, unknown> })
        .eq("document_id", docId)
        .select()
        .single();
      if (error) throw new Error(`saveExtraction 更新失败: ${error.message}`);
    } else {
      const { error } = await this.client.from("document_extractions").insert({
        document_id: docId,
        extracted_fields_json: fields as unknown as Record<string, unknown>,
      });
      if (error) throw new Error(`saveExtraction 插入失败: ${error.message}`);
    }
    await this.updateDocumentStatus(userId, docId, "awaiting_confirmation");
    const rec = await this.getExtraction(userId, docId);
    if (!rec) throw new Error("extraction 读取失败");
    void now;
    return rec;
  }

  async getExtraction(
    userId: string,
    docId: string,
  ): Promise<ExtractionRecord | null> {
    const doc = await this.getDocument(userId, docId);
    if (!doc) return null;
    const { data } = await this.client
      .from("document_extractions")
      .select("*")
      .eq("document_id", docId)
      .single();
    if (!data) return null;
    const r = data as unknown as {
      extracted_fields_json: DocumentField[];
      confirmed_fields_json: Record<string, string>;
      created_at: string;
      updated_at: string;
    };
    return {
      documentId: docId,
      fields: r.extracted_fields_json ?? [],
      confirmedFields: r.confirmed_fields_json ?? {},
      status: Object.keys(r.confirmed_fields_json ?? {}).length > 0 ? "confirmed" : "extracted",
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  async confirmExtraction(
    userId: string,
    docId: string,
    confirmed: Record<string, string>,
  ): Promise<ExtractionRecord> {
    const { error } = await this.client
      .from("document_extractions")
      .update({ confirmed_fields_json: confirmed })
      .eq("document_id", docId);
    if (error) throw new Error(`confirmExtraction 失败: ${error.message}`);
    await this.updateDocumentStatus(userId, docId, "ready");
    const rec = await this.getExtraction(userId, docId);
    if (!rec) throw new Error("extraction 读取失败");
    return rec;
  }
}

/* ============ 工厂 ============ */

let demoRepo: DemoRepository | null = null;

export async function getRepository(): Promise<{
  repo: FinPathRepository;
  userId: string;
  mode: "supabase" | "demo";
}> {
  const client = await createServerSupabaseClient();
  if (client) {
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) {
      // 未登录：由调用方返回 401
      throw new AuthRequiredError();
    }
    return { repo: new SupabaseRepository(client), userId: user.id, mode: "supabase" };
  }
  if (!demoRepo) demoRepo = new DemoRepository();
  return { repo: demoRepo, userId: DEMO_USER_ID, mode: "demo" };
}

export class AuthRequiredError extends Error {
  constructor() {
    super("AUTH_REQUIRED");
  }
}
