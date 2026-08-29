import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/finpath/placeholder-page";

export const metadata: Metadata = { title: "上传产品材料" };

/** P04 金融产品上传与识别确认页（阶段 2 实现） */
export default function DocumentNewPage() {
  return (
    <PlaceholderPage
      prototypeId="P04"
      title="一个产品，先帮你看懂"
      description="上传截图或 PDF，AI 先提取关键信息，再由你确认。"
      route="/documents/new"
    />
  );
}
