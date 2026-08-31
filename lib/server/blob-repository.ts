import "server-only";

import { randomUUID } from "node:crypto";
import {
  BlobPreconditionFailedError,
  get,
  put,
} from "@vercel/blob";
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
} from "@/lib/types";
import type {
  CreateAssetInput,
  CreateDocumentInput,
  CreatePlanInput,
  CreateTaskInput,
  DocumentRecord,
  FinPathRepository,
} from "@/lib/server/repository";

const ESTIMATED_MONTHLY_SPEND = 7500;
const STATE_VERSION = 1;
const MAX_WRITE_ATTEMPTS = 4;

type UserState = {
  version: typeof STATE_VERSION;
  assets: Asset[];
  goals: Goal[];
  tasks: Task[];
  sessions: DiagnosisRecord[];
  plans: PlanRecord[];
  documents: DocumentRecord[];
  extractions: ExtractionRecord[];
  updatedAt: string;
};

type LoadedState = { state: UserState; etag: string | null };

function emptyState(): UserState {
  return {
    version: STATE_VERSION,
    assets: [],
    goals: [],
    tasks: [],
    sessions: [],
    plans: [],
    documents: [],
    extractions: [],
    updatedAt: new Date().toISOString(),
  };
}

function assetAmount(asset: Asset): number {
  if (asset.amountExact != null) return asset.amountExact;
  if (asset.amountMin != null && asset.amountMax != null) {
    return Math.round((asset.amountMin + asset.amountMax) / 2);
  }
  return 0;
}

export function hasBlobEnv(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      (process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID),
  );
}

class BlobStateStore {
  private readonly prefix: string;
  private readonly locks = new Map<string, Promise<void>>();

  constructor() {
    this.prefix = (process.env.BLOB_PREFIX ?? "finpath-beta").replace(
      /^\/+|\/+$/g,
      "",
    );
  }

  private stateKey(userId: string): string {
    return `${this.prefix}/users/${userId}/state.json`;
  }

  documentKey(userId: string, documentId: string): string {
    return `${this.prefix}/users/${userId}/documents/${documentId}/source`;
  }

  async load(userId: string): Promise<LoadedState> {
    const result = await get(this.stateKey(userId), {
      access: "private",
      useCache: false,
    });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return { state: emptyState(), etag: null };
    }
    const content = Buffer.from(await new Response(result.stream).arrayBuffer());
    const parsed = JSON.parse(content.toString("utf8")) as UserState;
    if (parsed.version !== STATE_VERSION) {
      throw new Error(`不支持的数据版本: ${String(parsed.version)}`);
    }
    return { state: parsed, etag: result.blob.etag };
  }

  async save(userId: string, state: UserState, etag: string | null): Promise<void> {
    state.updatedAt = new Date().toISOString();
    await put(this.stateKey(userId), Buffer.from(JSON.stringify(state)), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json; charset=utf-8",
      cacheControlMaxAge: 60,
      ...(etag ? { ifMatch: etag } : {}),
    });
  }

  async read<T>(userId: string, reader: (state: UserState) => T): Promise<T> {
    const { state } = await this.load(userId);
    return reader(state);
  }

  async update<T>(
    userId: string,
    updater: (state: UserState) => T | Promise<T>,
  ): Promise<T> {
    return this.withUserLock(userId, async () => {
      for (let attempt = 1; attempt <= MAX_WRITE_ATTEMPTS; attempt += 1) {
        const { state, etag } = await this.load(userId);
        const result = await updater(state);
        try {
          await this.save(userId, state, etag);
          return result;
        } catch (error) {
          if (
            error instanceof BlobPreconditionFailedError &&
            attempt < MAX_WRITE_ATTEMPTS
          ) {
            continue;
          }
          throw error;
        }
      }
      throw new Error("Blob 数据写入冲突，请重试");
    });
  }

  private async withUserLock<T>(userId: string, task: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(userId) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = previous.then(() => gate);
    this.locks.set(userId, tail);
    await previous;
    try {
      return await task();
    } finally {
      release();
      if (this.locks.get(userId) === tail) this.locks.delete(userId);
    }
  }

  async putDocument(
    userId: string,
    documentId: string,
    input: CreateDocumentInput,
  ): Promise<void> {
    await put(this.documentKey(userId, documentId), input.buffer, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: input.mimeType,
      cacheControlMaxAge: 60,
      maximumSizeInBytes: 4 * 1024 * 1024,
    });
  }

  async getDocument(userId: string, documentId: string): Promise<Buffer | null> {
    const result = await get(this.documentKey(userId, documentId), {
      access: "private",
      useCache: false,
    });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    return Buffer.from(await new Response(result.stream).arrayBuffer());
  }
}

let sharedStore: BlobStateStore | null = null;

function store(): BlobStateStore {
  sharedStore ??= new BlobStateStore();
  return sharedStore;
}

export class VercelBlobRepository implements FinPathRepository {
  async getMoneyMap(userId: string): Promise<MoneyMap> {
    return store().read(userId, (state) => {
      const assets = state.assets.filter((item) => item.kind === "asset");
      const liabilities = state.assets.filter((item) => item.kind === "liability");
      const totalAssets = assets.reduce((sum, item) => sum + assetAmount(item), 0);
      const totalLiabilities = liabilities.reduce(
        (sum, item) => sum + assetAmount(item),
        0,
      );
      const cash = assets
        .filter((item) => item.category === "现金与活期")
        .reduce((sum, item) => sum + assetAmount(item), 0);
      return {
        totalAssets,
        totalLiabilities,
        netAssets: totalAssets - totalLiabilities,
        emergencyCoverageMonths:
          Math.round((cash / ESTIMATED_MONTHLY_SPEND) * 10) / 10,
        assets,
        liabilities,
        goals: state.goals,
        updatedAt: state.updatedAt.slice(0, 10),
      };
    });
  }

  async listAssets(userId: string): Promise<Asset[]> {
    return store().read(userId, (state) =>
      state.assets.filter((item) => item.kind !== "goal"),
    );
  }

  async createAsset(userId: string, input: CreateAssetInput): Promise<Asset> {
    return store().update(userId, (state) => {
      const asset: Asset = {
        id: randomUUID(),
        ...input,
        currency: "CNY",
      };
      if (input.kind === "goal") {
        state.goals.unshift({
          id: asset.id,
          title: input.label,
          targetAmount: input.amountExact ?? input.amountMax ?? 0,
          currentAmount: 0,
          progress: 0,
        });
      } else {
        state.assets.unshift(asset);
      }
      return asset;
    });
  }

  async updateAsset(
    userId: string,
    id: string,
    input: Partial<CreateAssetInput>,
  ): Promise<Asset | null> {
    return store().update(userId, (state) => {
      const asset = state.assets.find((item) => item.id === id);
      if (!asset) return null;
      Object.assign(asset, input, { currency: "CNY" as const });
      return asset;
    });
  }

  async deleteAsset(userId: string, id: string): Promise<boolean> {
    return store().update(userId, (state) => {
      const before = state.assets.length;
      state.assets = state.assets.filter((item) => item.id !== id);
      state.goals = state.goals.filter((item) => item.id !== id);
      return state.assets.length < before;
    });
  }

  async listTasks(userId: string): Promise<Task[]> {
    return store().read(userId, (state) =>
      [...state.tasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    );
  }

  async getTask(userId: string, id: string): Promise<Task | null> {
    return store().read(
      userId,
      (state) => state.tasks.find((item) => item.id === id) ?? null,
    );
  }

  async createTask(userId: string, input: CreateTaskInput): Promise<Task> {
    return store().update(userId, (state) => {
      const steps: TaskStep[] = (input.steps ?? []).map((item, index) => ({
        id: randomUUID(),
        position: index + 1,
        title: item.title,
        description: item.description,
        status: index === 0 ? "doing" : "todo",
        estimatedMinutes: item.estimatedMinutes,
      }));
      const task: Task = {
        id: randomUUID(),
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
      state.tasks.unshift(task);
      return task;
    });
  }

  async updateTaskStatus(
    userId: string,
    id: string,
    status: TaskStatus,
  ): Promise<Task | null> {
    return store().update(userId, (state) => {
      const task = state.tasks.find((item) => item.id === id);
      if (!task) return null;
      task.status = status;
      if (status === "completed") {
        task.steps.forEach((step) => {
          step.status = "done";
        });
        task.progressCurrent = task.progressTotal;
        task.nextAction = "任务已完成";
      }
      task.updatedAt = new Date().toISOString().slice(0, 10);
      return task;
    });
  }

  async completeStep(
    userId: string,
    taskId: string,
    stepId: string,
  ): Promise<Task | null> {
    return store().update(userId, (state) => {
      const task = state.tasks.find((item) => item.id === taskId);
      const step = task?.steps.find((item) => item.id === stepId);
      if (!task || !step) return null;
      step.status = "done";
      task.progressCurrent = task.steps.filter((item) => item.status === "done").length;
      const next = task.steps.find((item) => item.status !== "done");
      if (task.progressCurrent >= task.progressTotal) {
        task.status = "completed";
        task.nextAction = "任务已完成";
      } else {
        task.status = "in_progress";
        if (next) {
          next.status = "doing";
          task.nextAction = next.title;
        }
      }
      task.updatedAt = new Date().toISOString().slice(0, 10);
      return task;
    });
  }

  async createDiagnosisSession(
    userId: string,
    input: { rawQuestion: string; scenarioType: ScenarioType },
  ): Promise<DiagnosisRecord> {
    return store().update(userId, (state) => {
      const now = new Date().toISOString();
      const session: DiagnosisRecord = {
        id: randomUUID(),
        rawQuestion: input.rawQuestion,
        scenarioType: input.scenarioType,
        status: "clarifying",
        currentQuestionKey: null,
        answers: {},
        createdAt: now,
        updatedAt: now,
      };
      state.sessions.unshift(session);
      return session;
    });
  }

  async getDiagnosisSession(
    userId: string,
    id: string,
  ): Promise<DiagnosisRecord | null> {
    return store().read(
      userId,
      (state) => state.sessions.find((item) => item.id === id) ?? null,
    );
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
    return store().update(userId, (state) => {
      const session = state.sessions.find((item) => item.id === id);
      if (!session) return null;
      if (patch.answers) session.answers = { ...session.answers, ...patch.answers };
      if (patch.currentQuestionKey !== undefined) {
        session.currentQuestionKey = patch.currentQuestionKey;
      }
      if (patch.status) session.status = patch.status;
      session.updatedAt = new Date().toISOString();
      return session;
    });
  }

  async createPlan(userId: string, input: CreatePlanInput): Promise<PlanRecord> {
    return store().update(userId, (state) => {
      const plan: PlanRecord = {
        id: randomUUID(),
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
        updatedAt: new Date().toISOString(),
      };
      state.plans.unshift(plan);
      return plan;
    });
  }

  async getPlan(userId: string, id: string): Promise<PlanRecord | null> {
    return store().read(
      userId,
      (state) => state.plans.find((item) => item.id === id) ?? null,
    );
  }

  async createDocument(
    userId: string,
    input: CreateDocumentInput,
  ): Promise<DocumentRecord> {
    const document: DocumentRecord = {
      id: randomUUID(),
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      status: "uploading",
      createdAt: new Date().toISOString(),
    };
    await store().putDocument(userId, document.id, input);
    return store().update(userId, (state) => {
      state.documents.unshift(document);
      return document;
    });
  }

  async getDocument(userId: string, id: string): Promise<DocumentRecord | null> {
    return store().read(
      userId,
      (state) => state.documents.find((item) => item.id === id) ?? null,
    );
  }

  async getDocumentBuffer(userId: string, id: string): Promise<Buffer | null> {
    const document = await this.getDocument(userId, id);
    return document ? store().getDocument(userId, id) : null;
  }

  async updateDocumentStatus(
    userId: string,
    id: string,
    status: DocumentRecord["status"],
  ): Promise<DocumentRecord | null> {
    return store().update(userId, (state) => {
      const document = state.documents.find((item) => item.id === id);
      if (!document) return null;
      document.status = status;
      return document;
    });
  }

  async saveExtraction(
    userId: string,
    docId: string,
    fields: DocumentField[],
  ): Promise<ExtractionRecord> {
    return store().update(userId, (state) => {
      const now = new Date().toISOString();
      let extraction = state.extractions.find((item) => item.documentId === docId);
      if (extraction) {
        extraction.fields = fields;
        extraction.confirmedFields = {};
        extraction.status = "extracted";
        extraction.updatedAt = now;
      } else {
        extraction = {
          documentId: docId,
          fields,
          confirmedFields: {},
          status: "extracted",
          createdAt: now,
          updatedAt: now,
        };
        state.extractions.push(extraction);
      }
      const document = state.documents.find((item) => item.id === docId);
      if (document) document.status = "awaiting_confirmation";
      return extraction;
    });
  }

  async getExtraction(
    userId: string,
    docId: string,
  ): Promise<ExtractionRecord | null> {
    return store().read(
      userId,
      (state) => state.extractions.find((item) => item.documentId === docId) ?? null,
    );
  }

  async confirmExtraction(
    userId: string,
    docId: string,
    confirmed: Record<string, string>,
  ): Promise<ExtractionRecord> {
    return store().update(userId, (state) => {
      const extraction = state.extractions.find((item) => item.documentId === docId);
      if (!extraction) throw new Error(`extraction 不存在: ${docId}`);
      extraction.confirmedFields = confirmed;
      extraction.status = "confirmed";
      extraction.updatedAt = new Date().toISOString();
      const document = state.documents.find((item) => item.id === docId);
      if (document) document.status = "ready";
      return extraction;
    });
  }
}
