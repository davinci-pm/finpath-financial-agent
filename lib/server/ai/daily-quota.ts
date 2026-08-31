import "server-only";

import {
  BlobPreconditionFailedError,
  get,
  put,
} from "@vercel/blob";

export type ModelQuotaKind = "text" | "document";

type QuotaRecord = {
  date: string;
  count: number;
  updatedAt: string;
};

const MAX_ATTEMPTS = 4;
const locks = new Map<string, Promise<void>>();

export class ModelQuotaExceededError extends Error {
  constructor(readonly kind: ModelQuotaKind) {
    super("MODEL_DAILY_QUOTA_EXCEEDED");
    this.name = "ModelQuotaExceededError";
  }
}

function quotaKey(userId: string, kind: ModelQuotaKind, date: string): string {
  const prefix = (process.env.BLOB_PREFIX ?? "finpath-beta").replace(
    /^\/+|\/+$/g,
    "",
  );
  return `${prefix}/usage/${date}/${userId}/${kind}.json`;
}

async function withLock<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve();
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tail = previous.then(() => gate);
  locks.set(key, tail);
  await previous;
  try {
    return await task();
  } finally {
    release();
    if (locks.get(key) === tail) locks.delete(key);
  }
}

export async function consumeDailyModelQuota(
  userId: string,
  kind: ModelQuotaKind,
  limit: number,
): Promise<number> {
  const date = new Date().toISOString().slice(0, 10);
  const key = quotaKey(userId, kind, date);

  return withLock(key, async () => {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const current = await get(key, { access: "private", useCache: false });
      let record: QuotaRecord = { date, count: 0, updatedAt: new Date().toISOString() };
      let etag: string | null = null;
      if (current?.statusCode === 200 && current.stream) {
        const content = await new Response(current.stream).text();
        record = JSON.parse(content) as QuotaRecord;
        etag = current.blob.etag;
      }
      if (record.count >= limit) throw new ModelQuotaExceededError(kind);

      record.count += 1;
      record.updatedAt = new Date().toISOString();
      try {
        await put(key, JSON.stringify(record), {
          access: "private",
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType: "application/json; charset=utf-8",
          cacheControlMaxAge: 60,
          ...(etag ? { ifMatch: etag } : {}),
        });
        return limit - record.count;
      } catch (error) {
        if (
          error instanceof BlobPreconditionFailedError &&
          attempt < MAX_ATTEMPTS
        ) {
          continue;
        }
        throw error;
      }
    }
    throw new Error("模型额度计数写入冲突，请重试");
  });
}
