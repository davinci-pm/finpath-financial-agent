import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/finpath/placeholder-page";

export const metadata: Metadata = { title: "资金地图" };

/**
 * P08 我的资金地图 / 个人金融驾驶舱（阶段 2 实现）。
 * P09 为 P08 上打开右侧抽屉（?drawer=add-asset），阶段 2 一并实现。
 */
export default function MoneyMapPage() {
  return (
    <PlaceholderPage
      prototypeId="P08"
      title="我的资金地图"
      description="先看全局，再决定下一步：总资产、负债、净资产与优先行动。"
      route="/money-map"
    />
  );
}
