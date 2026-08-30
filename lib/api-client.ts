import type { Asset, MoneyMap, Task } from "@/lib/types";

/**
 * 前端 API 客户端（阶段 3）
 * 无 Supabase 凭据时，服务端自动回退 DemoRepository，返回数据结构一致。
 */

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    let message = `请求失败（${res.status}）`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

/* ============ 资金地图 ============ */

export async function fetchMoneyMap(): Promise<MoneyMap> {
  const data = await request<MoneyMap & { mode?: string }>("/api/money-map");
  delete (data as { mode?: string }).mode;
  return data;
}

/* ============ 资产 ============ */

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

export async function createAsset(input: CreateAssetInput): Promise<Asset> {
  const data = await request<{ asset: Asset }>("/api/assets", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.asset;
}

export async function updateAsset(
  id: string,
  input: Partial<CreateAssetInput>,
): Promise<Asset> {
  const data = await request<{ asset: Asset }>(`/api/assets/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data.asset;
}

export async function deleteAsset(id: string): Promise<void> {
  await request<{ ok: boolean }>(`/api/assets/${id}`, { method: "DELETE" });
}

/* ============ 任务 ============ */

export type CreateTaskInput = {
  sourceType: Task["sourceType"];
  sourceId: string;
  title: string;
  summary?: string;
  nextAction?: string;
  steps?: Array<{ title: string; description?: string; estimatedMinutes?: number }>;
};

export async function fetchTasks(): Promise<Task[]> {
  const data = await request<{ tasks: Task[] }>("/api/tasks");
  return data.tasks;
}

export async function fetchTask(id: string): Promise<Task> {
  const data = await request<{ task: Task }>(`/api/tasks/${id}`);
  return data.task;
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const data = await request<{ task: Task }>("/api/tasks", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.task;
}

export async function updateTaskStatus(
  id: string,
  status: Task["status"],
): Promise<Task> {
  const data = await request<{ task: Task }>(`/api/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return data.task;
}

export async function completeTaskStep(taskId: string, stepId: string): Promise<Task> {
  const data = await request<{ task: Task }>(`/api/tasks/${taskId}/steps/${stepId}`, {
    method: "PATCH",
    body: JSON.stringify({}),
  });
  return data.task;
}
