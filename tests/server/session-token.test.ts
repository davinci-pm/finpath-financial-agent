// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createSessionToken,
  verifySessionToken,
} from "@/lib/auth/session-token";

const SECRET = "test-only-session-secret-with-at-least-32-chars";

describe("邀请码会话令牌", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = SECRET;
  });

  afterEach(() => {
    delete process.env.SESSION_SECRET;
  });

  it("可签发并验证用户隔离载荷", async () => {
    const token = await createSessionToken(
      { userId: "user-1", inviteId: "invite-1" },
      new Date(Date.now() + 60_000),
    );

    await expect(verifySessionToken(token)).resolves.toEqual({
      userId: "user-1",
      inviteId: "invite-1",
    });
  });

  it("拒绝被篡改和已过期的令牌", async () => {
    const valid = await createSessionToken(
      { userId: "user-1", inviteId: "invite-1" },
      new Date(Date.now() + 60_000),
    );
    const tampered = `${valid.slice(0, -1)}${valid.endsWith("a") ? "b" : "a"}`;
    const expired = await createSessionToken(
      { userId: "user-1", inviteId: "invite-1" },
      new Date(Date.now() - 60_000),
    );

    await expect(verifySessionToken(tampered)).resolves.toBeNull();
    await expect(verifySessionToken(expired)).resolves.toBeNull();
  });

  it("拒绝过短的会话密钥", async () => {
    process.env.SESSION_SECRET = "too-short";
    await expect(
      createSessionToken(
        { userId: "user-1", inviteId: "invite-1" },
        new Date(Date.now() + 60_000),
      ),
    ).rejects.toThrow("至少为 32 个字符");
  });
});
