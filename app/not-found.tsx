import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <p className="font-number text-sm font-semibold text-primary">404</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">没有找到这个页面</h1>
        <p className="mt-3 text-sm text-muted-foreground">链接可能已过期，或对应内容已被移除。</p>
        <Button className="mt-6" asChild><Link href="/">返回首页</Link></Button>
      </div>
    </main>
  );
}
