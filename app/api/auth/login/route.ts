import { NextResponse } from "next/server";
import { z } from "zod";
import { validateInviteCode } from "@/lib/server/auth/invites";
import { createSession } from "@/lib/server/auth/session";

const LoginSchema = z.object({
  code: z.string().trim().min(12).max(64),
});

const attempts = new Map<string, { count: number; resetAt: number }>();
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function clientKey(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > MAX_ATTEMPTS;
}

export async function POST(request: Request) {
  const key = clientKey(request);
  if (isRateLimited(key)) {
    return NextResponse.json(
      { error: "尝试次数过多，请稍后再试" },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "请输入有效的邀请码" }, { status: 400 });
  }

  try {
    const invite = validateInviteCode(parsed.data.code);
    if (!invite) {
      return NextResponse.json(
        { error: "邀请码无效或已过期" },
        { status: 401 },
      );
    }
    await createSession(invite.userId, invite.id, invite.expiresAt);
    attempts.delete(key);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[auth/login] 登录配置异常", error);
    return NextResponse.json({ error: "登录服务暂不可用" }, { status: 503 });
  }
}
