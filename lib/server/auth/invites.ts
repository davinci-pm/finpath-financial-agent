import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const InviteRecordSchema = z.object({
  id: z.string().min(1).max(64),
  userId: z.uuid(),
  codeHash: z.string().regex(/^[a-f0-9]{64}$/),
  expiresAt: z.iso.datetime(),
});

const InviteRecordsSchema = z.array(InviteRecordSchema).min(1).max(1000);

export type InviteRecord = z.infer<typeof InviteRecordSchema>;

export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase();
}

export function hashInviteCode(code: string): string {
  return createHash("sha256").update(normalizeInviteCode(code)).digest("hex");
}

function inviteRecords(): InviteRecord[] {
  const raw = process.env.INVITE_CODE_RECORDS;
  if (!raw) throw new Error("未配置 INVITE_CODE_RECORDS");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("INVITE_CODE_RECORDS 不是合法 JSON");
  }
  return InviteRecordsSchema.parse(parsed);
}

function equalHex(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

export function validateInviteCode(code: string): InviteRecord | null {
  const normalized = normalizeInviteCode(code);
  if (normalized.length < 12 || normalized.length > 64) return null;
  const digest = hashInviteCode(normalized);
  const record = inviteRecords().find((item) => equalHex(item.codeHash, digest));
  if (!record || Date.parse(record.expiresAt) <= Date.now()) return null;
  return record;
}
