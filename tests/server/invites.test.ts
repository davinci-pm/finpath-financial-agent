import { afterEach, describe, expect, it } from "vitest";
import {
  hashInviteCode,
  normalizeInviteCode,
  validateInviteCode,
} from "@/lib/server/auth/invites";

const CODE = "FINPATH-TEST-CODE-0001";

function setRecords(expiresAt: string) {
  process.env.INVITE_CODE_RECORDS = JSON.stringify([
    {
      id: "invite-test",
      userId: "00000000-0000-4000-8000-000000000001",
      codeHash: hashInviteCode(CODE),
      expiresAt,
    },
  ]);
}

describe("一人一码邀请登录", () => {
  afterEach(() => {
    delete process.env.INVITE_CODE_RECORDS;
  });

  it("忽略大小写和两端空格，返回固定用户", () => {
    setRecords(new Date(Date.now() + 60_000).toISOString());

    expect(normalizeInviteCode(`  ${CODE.toLowerCase()}  `)).toBe(CODE);
    expect(validateInviteCode(`  ${CODE.toLowerCase()}  `)?.userId).toBe(
      "00000000-0000-4000-8000-000000000001",
    );
  });

  it("拒绝错误或过期的邀请码", () => {
    setRecords(new Date(Date.now() - 60_000).toISOString());

    expect(validateInviteCode(CODE)).toBeNull();
    expect(validateInviteCode("FINPATH-WRONG-CODE-9999")).toBeNull();
  });

  it("环境变量格式错误时拒绝启动验证", () => {
    process.env.INVITE_CODE_RECORDS = "not-json";
    expect(() => validateInviteCode(CODE)).toThrow("不是合法 JSON");
  });
});
