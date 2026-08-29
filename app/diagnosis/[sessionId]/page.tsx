import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/finpath/placeholder-page";

export const metadata: Metadata = { title: "澄清条件" };

/** P02 AI 澄清与条件确认页（动态路由占位，阶段 2 实现） */
export default async function DiagnosisPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return (
    <PlaceholderPage
      prototypeId="P02"
      title="澄清条件"
      description="一次只确认一个关键条件，实时汇总你的当前情况。"
      route={`/diagnosis/${sessionId}`}
    />
  );
}
