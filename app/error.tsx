"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-medium text-destructive">页面暂时不可用</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">我们没能完成这次操作</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          你的数据不会因为刷新而自动提交。可以重试，或返回工作台继续操作。
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={reset}>重试</Button>
          <Button variant="outline" asChild><Link href="/money-map">返回工作台</Link></Button>
        </div>
      </div>
    </main>
  );
}
