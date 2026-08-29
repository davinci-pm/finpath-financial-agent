import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/finpath/placeholder-page";

export const metadata: Metadata = { title: "学习节点" };

/** P06 投资入门学习路径页（动态路由占位，阶段 2 实现） */
export default async function LearnPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <PlaceholderPage
      prototypeId="P06"
      title="学习路径"
      description="通过情景卡和判断题理解一个金融概念，保存学习进度。"
      route={`/learn/${slug}`}
    />
  );
}
