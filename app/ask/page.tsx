import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "问 AI" };

/**
 * 问 AI 入口页（侧栏第 2 项）。
 * 阶段 2 实现：登录后版本的提问输入 + 四张场景卡，跳转澄清/上传流程。
 */
export default function AskPage() {
  return (
    <AppShell
      title="问 AI"
      description="把和钱有关的问题直接说出来，AI 帮你理清条件、比较路径、列出下一步。"
    >
      <Card className="rounded-2xl bg-card shadow-card">
        <CardContent className="flex flex-col items-start gap-4 p-8">
          <Badge variant="secondary" className="rounded-full">
            阶段 1 占位
          </Badge>
          <p className="max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            阶段 2 将在此实现提问输入框与四个快捷场景入口（钱该怎么安排、产品帮我看懂、投资怎么开始、金融业务怎么办）。
          </p>
        </CardContent>
      </Card>
    </AppShell>
  );
}
