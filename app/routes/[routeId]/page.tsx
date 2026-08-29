import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/finpath/placeholder-page";

export const metadata: Metadata = { title: "金融办事路线" };

/** P07 金融办事路线页（动态路由占位，阶段 2 实现） */
export default async function RoutePage({
  params,
}: {
  params: Promise<{ routeId: string }>;
}) {
  const { routeId } = await params;
  return (
    <PlaceholderPage
      prototypeId="P07"
      title="金融办事路线"
      description="分步骤时间轴、材料清单与费用说明，逐项勾选并保存进度。"
      route={`/routes/${routeId}`}
    />
  );
}
