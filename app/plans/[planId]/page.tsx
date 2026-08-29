import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/finpath/placeholder-page";

export const metadata: Metadata = { title: "行动路径" };

/** P03 个性化金融行动路径结果页（动态路由占位，阶段 2 实现） */
export default async function PlanPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  return (
    <PlaceholderPage
      prototypeId="P03"
      title="你的资金安排路径"
      description="结论先行，附适用条件、风险说明与可执行行动清单。"
      route={`/plans/${planId}`}
    />
  );
}
