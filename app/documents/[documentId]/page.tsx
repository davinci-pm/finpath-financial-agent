import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/finpath/placeholder-page";

export const metadata: Metadata = { title: "产品解读" };

/** P05 金融产品解读结果页（动态路由占位，阶段 2 实现） */
export default async function DocumentPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
  return (
    <PlaceholderPage
      prototypeId="P05"
      title="产品解读"
      description="先说结论，再看关键信息、风险与购买前要确认的问题。"
      route={`/documents/${documentId}`}
    />
  );
}
