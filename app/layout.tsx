import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "FinPath — 把金融知识，变成下一步行动",
    template: "%s · FinPath",
  },
  description:
    "FinPath 将模糊金融问题转换为有条件、有证据、有风险说明、可执行、可持续跟踪的行动路径。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
