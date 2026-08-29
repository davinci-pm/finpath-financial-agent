import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("合并多个类名", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("忽略假值", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });

  it("tailwind-merge 处理冲突类", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("保留自定义类与变量类", () => {
    expect(cn("rounded-2xl", "shadow-card", "bg-card")).toContain("rounded-2xl");
  });
});
