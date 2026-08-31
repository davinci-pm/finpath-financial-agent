import { Suspense } from "react";
import { Compass, LockKeyhole } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "邀请码登录",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 flex flex-col items-center text-center">
          <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-card">
            <Compass className="size-6" aria-hidden />
          </span>
          <h1 className="text-3xl font-bold tracking-tight">欢迎来到 FinPath</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            当前为邀请制内测，仅向受邀用户开放
          </p>
        </div>
        <Card className="rounded-2xl py-6 shadow-card">
          <CardHeader className="px-6">
            <CardTitle className="text-lg">使用邀请码登录</CardTitle>
          </CardHeader>
          <CardContent className="px-6">
            <Suspense fallback={<div className="h-28 animate-pulse rounded-xl bg-muted" />}>
              <LoginForm />
            </Suspense>
            <div className="mt-6 flex items-start gap-2 border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">
              <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>每个邀请码对应独立账号。你的金融数据和上传文件不会与其他用户共享。</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
