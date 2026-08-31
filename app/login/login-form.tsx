"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function safeNext(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!response.ok) {
        setError(body?.error ?? "登录失败，请稍后重试");
        return;
      }
      router.replace(safeNext(searchParams.get("next")));
      router.refresh();
    } catch {
      setError("网络连接失败，请稍后重试");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div className="space-y-2">
        <Label htmlFor="invite-code">邀请码</Label>
        <Input
          id="invite-code"
          name="invite-code"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="输入你收到的邀请码"
          autoComplete="one-time-code"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={64}
          className="h-12 px-4 font-number tracking-wide"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "login-error" : undefined}
          required
        />
        {error ? (
          <p id="login-error" className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <Button type="submit" size="lg" className="h-11 w-full" disabled={pending}>
        {pending ? (
          <LoaderCircle className="animate-spin" aria-hidden />
        ) : (
          <ArrowRight aria-hidden />
        )}
        {pending ? "正在验证" : "进入 FinPath"}
      </Button>
    </form>
  );
}
