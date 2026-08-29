import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/finpath/placeholder-page";

export const metadata: Metadata = { title: "学习" };

/** 学习中心（侧栏第 4 项），阶段 2 实现主题列表 */
export default function LearnIndexPage() {
  return (
    <PlaceholderPage
      title="学习"
      description="一页一个知识点和一个问题，学习与模拟，不连接真实交易。"
      route="/learn"
    />
  );
}
