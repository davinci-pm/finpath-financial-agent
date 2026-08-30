import { Suspense } from "react";
import { MoneyMapView } from "@/components/finpath/money-map-view";
import { SkeletonState } from "@/components/finpath/skeleton-state";

/**
 * P08 我的资金地图 / 个人金融驾驶舱
 * useSearchParams（?drawer=add-asset → P09）需 Suspense 边界，故拆 server wrapper + client 视图。
 */
export default function MoneyMapPage() {
  return (
    <Suspense fallback={<SkeletonState rows={4} className="mt-6" />}>
      <MoneyMapView />
    </Suspense>
  );
}
