import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/finpath/placeholder-page";

export const metadata: Metadata = { title: "任务详情" };

/** P11 金融任务详情与相似经验（动态路由占位，任务真实、经验 Mock） */
export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  return (
    <PlaceholderPage
      prototypeId="P11"
      title="任务详情"
      description="任务目标、条件摘要、进度与行动清单；相似经验明确标注个人经验。"
      route={`/tasks/${taskId}`}
    />
  );
}
