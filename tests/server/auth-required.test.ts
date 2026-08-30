import { describe, expect, it, vi } from "vitest";

// 模拟：Supabase 已配置但用户未登录 → getRepository 必须抛 AuthRequiredError（API 层转 401）
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: null } }),
    },
  }),
}));

import { AuthRequiredError, getRepository } from "@/lib/server/repository";

describe("鉴权：Supabase 已配置但未登录", () => {
  it("getRepository 抛出 AuthRequiredError（API 层转为 401）", async () => {
    await expect(getRepository()).rejects.toBeInstanceOf(AuthRequiredError);
  });
});
