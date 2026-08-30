"use client";

import { use, useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorState } from "@/components/finpath/error-state";
import { cn } from "@/lib/utils";
import { MOCK_LEARN_NODE, MOCK_LEARN_PATH } from "@/lib/mock-data";
import type { LearnNode, LearnPath } from "@/lib/types";

type Feedback = { ok: boolean; text: string } | null;
type LearningTopic = {
  path: LearnPath;
  node: LearnNode;
  correctAnswer: string;
  success: string;
  retry: string;
};

const topic = (
  slug: string,
  title: string,
  minutes: number,
  nodeTitle: string,
  scenario: string,
  question: string,
  options: LearnNode["options"],
  correctAnswer: string,
  success: string,
  retry: string,
  willLearn: string[],
): LearningTopic => ({
  path: {
    slug,
    title,
    subtitle: `约 ${minutes} 分钟 · 学习与模拟，不连接真实交易`,
    durationMinutes: minutes,
    nodes: [{ slug: "core", title: nodeTitle, status: "current" }],
    willLearn,
  },
  node: { slug: "core", title: nodeTitle, position: 1, total: 1, scenario, question, options },
  correctAnswer,
  success,
  retry,
});

const LEARNING_TOPICS: Record<string, LearningTopic> = {
  "treasury-bonds": {
    path: MOCK_LEARN_PATH,
    node: MOCK_LEARN_NODE,
    correctAnswer: "term_and_liquidity",
    success: "正确。期限是否与你的用钱时间匹配，决定这笔钱是否适合买这款国债。",
    retry: "再想想：收益率高不代表适合你。你需要先确认期限与自己的用钱时间是否匹配。",
  },
  "emergency-fund": topic(
    "emergency-fund", "用 8 分钟，建立应急储备", 8, "应急储备应该覆盖什么",
    "你的收入暂时中断，但房租、吃饭和还款仍会继续。", "哪笔支出更适合由应急储备覆盖？",
    [
      { value: "daily_need", label: "失业期间的必要生活和还款支出" },
      { value: "holiday", label: "临时决定的度假升级" },
      { value: "speculation", label: "趁市场下跌追加高波动投资" },
    ],
    "daily_need", "正确。应急储备用于不可回避的必要支出，并应保持较高流动性。",
    "再想想：应急储备首先保护基本生活，不承担可推迟消费或投资风险。",
    ["估算必要月支出", "理解 3～6 个月只是参考区间", "选择便于随时使用的存放方式"],
  ),
  "fund-basics": topic(
    "fund-basics", "用 15 分钟，理解基金定投", 15, "定投不能消除波动",
    "你打算每月投入一笔钱，但两年内可能需要支付学费。", "开始定投前，最重要的判断是什么？",
    [
      { value: "time_risk", label: "投入期限和亏损承受能力是否匹配" },
      { value: "past_rank", label: "只选去年涨幅第一的基金" },
      { value: "guaranteed", label: "把定投当作保证盈利的方法" },
    ],
    "time_risk", "正确。定投分散的是买入时点，并不会消除本金亏损或产品本身的风险。",
    "再想想：历史排名和分批投入都不能保证收益，先确认期限与风险承受能力。",
    ["理解定投的作用和局限", "识别费率与波动", "避免把短期必用资金投入高波动产品"],
  ),
  "gold-basics": topic(
    "gold-basics", "用 10 分钟，理解黄金与分散配置", 10, "黄金不是稳定收益工具",
    "你已经持有较多黄金，近期金价上涨后想继续集中买入。", "更稳妥的下一步是什么？",
    [
      { value: "allocation", label: "先检查黄金占总资产的比例与用途" },
      { value: "chase", label: "因为近期上涨就集中追加" },
      { value: "income", label: "把黄金等同于固定利息产品" },
    ],
    "allocation", "正确。黄金可用于分散部分风险，但价格也会波动，比例应服务于整体目标。",
    "再想想：黄金不产生固定利息，近期上涨也不代表未来表现。先检查整体配置。",
    ["理解黄金的分散作用", "认识价格波动与机会成本", "避免追涨和过度集中"],
  ),
};

/**
 * P06 投资入门学习路径页
 * 一页一个知识点和一个问题；选择后才允许查看解释；模拟学习不连接真实交易。
 * 参考：P06-learning.png
 */
export default function LearnPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectedContent = LEARNING_TOPICS[slug];
  const content = selectedContent ?? LEARNING_TOPICS["treasury-bonds"];
  const path = content.path;
  const node = content.node;
  const current = path.nodes.find((n) => n.status === "current") ?? path.nodes[0];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem(`finpath:learn:${path.slug}`);
        if (!saved) return;
        const parsed = JSON.parse(saved) as { selected?: string; feedback?: Feedback };
        if (parsed.selected) setSelected(parsed.selected);
        if (parsed.feedback) setFeedback(parsed.feedback);
      } catch {
        // 忽略损坏的本地学习进度，用户仍可重新作答。
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [path.slug]);

  if (!selectedContent) {
    return (
      <AppShell title="学习内容不存在">
        <ErrorState recoverable={false} title="没有找到这个学习主题" description="请从学习中心重新选择一个主题。" />
      </AppShell>
    );
  }

  const handleSubmit = () => {
    if (!selected) return;
    const ok = selected === content.correctAnswer;
    const nextFeedback = {
      ok,
      text: ok ? content.success : content.retry,
    };
    setFeedback(nextFeedback);
    localStorage.setItem(
      `finpath:learn:${path.slug}`,
      JSON.stringify({ selected, feedback: nextFeedback }),
    );
  };

  return (
    <AppShell
      title={path.title}
      description={path.subtitle}
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[760px_1fr]">
        {/* 左：当前学习节点 */}
        <section>
          <p className="text-sm text-muted-foreground">
            第 <span className="font-number font-medium text-foreground">{node.position}</span> /{" "}
            {node.total} 节
          </p>
          <h2 className="mt-2 text-[24px] font-bold leading-snug text-foreground">
            {node.title}
          </h2>

          <Card className="mt-5 rounded-2xl bg-card shadow-card">
            <CardContent className="p-6">
              <p className="text-[16px] leading-relaxed text-foreground">
                <span className="mr-2 rounded-md bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">
                  情景
                </span>
                {node.scenario}
              </p>

              <h3 className="mt-5 text-[17px] font-semibold text-foreground">{node.question}</h3>
              <div className="mt-3 space-y-3" role="radiogroup" aria-label={node.question}>
                {node.options.map((opt, index) => {
                  const isSelected = selected === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      ref={(element) => {
                        optionRefs.current[index] = element;
                      }}
                      tabIndex={isSelected || (!selected && index === 0) ? 0 : -1}
                      onClick={() => {
                        setSelected(opt.value);
                        setFeedback(null);
                      }}
                      onKeyDown={(event) => {
                        const direction = event.key === "ArrowDown" || event.key === "ArrowRight"
                          ? 1
                          : event.key === "ArrowUp" || event.key === "ArrowLeft"
                            ? -1
                            : 0;
                        if (!direction) return;
                        event.preventDefault();
                        const nextIndex = (index + direction + node.options.length) % node.options.length;
                        setSelected(node.options[nextIndex].value);
                        setFeedback(null);
                        optionRefs.current[nextIndex]?.focus();
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left text-[15px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                        isSelected
                          ? "border-primary bg-primary-soft text-foreground"
                          : "border-border bg-white text-foreground hover:border-primary/40",
                      )}
                    >
                      {opt.label}
                      <span
                        className={cn(
                          "flex size-5 items-center justify-center rounded-full border",
                          isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border",
                        )}
                        aria-hidden
                      >
                        {isSelected ? <Check className="size-3.5" /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 flex items-center gap-3">
                <Button
                  onClick={handleSubmit}
                  disabled={!selected}
                  className="rounded-xl px-6"
                >
                  提交判断
                </Button>
                {feedback ? (
                  <p
                    role="status"
                    className={cn(
                      "flex items-center gap-2 text-sm",
                      feedback.ok ? "text-primary" : "text-warning",
                    )}
                  >
                    {feedback.ok ? (
                      <Check className="size-4" aria-hidden />
                    ) : (
                      <X className="size-4" aria-hidden />
                    )}
                    {feedback.text}
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 右：路径进度 */}
        <aside>
          <Card className="rounded-2xl bg-card shadow-card">
            <CardHeader>
              <CardTitle className="text-[17px] font-semibold text-foreground">学习路径</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative space-y-1 border-l border-border pl-5">
                {path.nodes.map((n) => (
                  <li key={n.slug} className="relative py-2">
                    <span
                      className={cn(
                        "absolute -left-[27px] flex size-4 items-center justify-center rounded-full border-2",
                        n.status === "done" && "border-primary bg-primary",
                        n.status === "current" && "border-primary bg-white",
                        n.status === "todo" && "border-border bg-white",
                      )}
                      aria-hidden
                    >
                      {n.status === "done" ? (
                        <Check className="size-2.5 text-primary-foreground" />
                      ) : null}
                    </span>
                    <p
                      className={cn(
                        "text-[15px]",
                        n.status === "done" && "text-muted-foreground",
                        n.status === "current" && "font-semibold text-foreground",
                        n.status === "todo" && "text-muted-foreground",
                      )}
                    >
                      {n.title}
                    </p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card className="mt-4 rounded-2xl bg-card shadow-card">
            <CardContent className="p-6">
              <h3 className="text-[15px] font-semibold text-foreground">完成后你将学会</h3>
              <ul className="mt-3 space-y-2">
                {path.willLearn.map((w) => (
                  <li key={w} className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                    {w}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">当前节点：{current.title}</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
