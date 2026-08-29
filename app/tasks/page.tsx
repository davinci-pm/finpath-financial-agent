import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/finpath/placeholder-page";

export const metadata: Metadata = { title: "我的任务" };

/** P10 我的金融任务中心（阶段 2 实现） */
export default function TasksPage() {
  return (
    <PlaceholderPage
      prototypeId="P10"
      title="我的金融任务"
      description="把复杂问题，变成一个个能完成的下一步。"
      route="/tasks"
    />
  );
}
