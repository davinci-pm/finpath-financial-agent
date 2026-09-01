export default function Loading() {
  return (
    <div className="fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-primary-soft" role="status" aria-label="页面加载中">
      <div className="route-loading-bar h-full w-full bg-primary" />
    </div>
  );
}
