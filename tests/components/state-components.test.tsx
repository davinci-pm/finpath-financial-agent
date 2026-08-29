import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorState } from "@/components/finpath/error-state";
import { SkeletonState } from "@/components/finpath/skeleton-state";

describe("ErrorState", () => {
  it("默认渲染错误标题与说明", () => {
    render(<ErrorState />);
    expect(screen.getByText("出了点问题")).toBeInTheDocument();
    expect(screen.getByText(/暂时无法完成操作/)).toBeInTheDocument();
  });

  it("展示重试按钮并触发回调", () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    const btn = screen.getByRole("button", { name: "重试" });
    btn.click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("recoverable=false 时不显示重试按钮", () => {
    render(<ErrorState recoverable={false} />);
    expect(screen.queryByRole("button", { name: "重试" })).not.toBeInTheDocument();
  });
});

describe("SkeletonState", () => {
  it("渲染加载状态与指定行数", () => {
    const { container } = render(<SkeletonState rows={4} />);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    // 4 行 × (1 长条 + 1 短条) + 顶部标题条
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThanOrEqual(9);
  });
});
