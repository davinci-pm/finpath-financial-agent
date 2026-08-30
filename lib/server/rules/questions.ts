import type { ClarificationQuestion } from "@/lib/types";

/**
 * 澄清问题模板（确定性，一次只问一个问题）。
 * 规则引擎决定缺失的关键字段，按固定顺序逐个发问；模型不生成问题本身，
 * 以保证结构化成功率与"一次一问"约束。
 */
export const CLARIFICATION_QUESTIONS: Record<
  string,
  Omit<ClarificationQuestion, "key">
> = {
  expectedUseHorizon: {
    question: "这笔钱大概多久以后可能用到？",
    reason: "期限决定资金可以承担多少波动。",
    options: [
      { value: "anytime", label: "随时可能用到（3 个月内）" },
      { value: "within_1y", label: "3～12 个月" },
      { value: "1_to_3y", label: "1～3 年" },
      { value: "after_3y", label: "3 年以上" },
    ],
    skippable: true,
  },
  emergencyFundMonths: {
    question: "你的应急储备大概能覆盖几个月？",
    reason: "影响是否需要优先补足应急资金。",
    options: [
      { value: "0", label: "还没有储备" },
      { value: "2", label: "1～3 个月" },
      { value: "4.5", label: "3～6 个月" },
      { value: "8", label: "6 个月以上" },
    ],
    skippable: true,
  },
  incomeStability: {
    question: "你的收入稳定性怎么样？",
    reason: "收入稳定程度影响应急储备与风险承担空间。",
    options: [
      { value: "low", label: "不太稳定（如自由职业）" },
      { value: "medium", label: "比较稳定" },
      { value: "high", label: "非常稳定" },
    ],
    skippable: true,
  },
  highInterestDebt: {
    question: "是否有利率较高的负债（如信用卡分期、消费贷）？",
    reason: "高息负债的偿还优先级高于投资。",
    options: [
      { value: "true", label: "有" },
      { value: "false", label: "没有" },
    ],
    skippable: true,
  },
  lossTolerance: {
    question: "这笔钱能承受多大波动？",
    reason: "确定适合的学习区和稳健区比例。",
    options: [
      { value: "none", label: "一点都不能亏" },
      { value: "small", label: "小幅波动可以接受" },
      { value: "medium", label: "短期明显波动可以接受" },
    ],
    skippable: true,
  },
};

/** 建议的澄清顺序（优先影响路径的关键字段） */
export const CLARIFICATION_ORDER = [
  "expectedUseHorizon",
  "emergencyFundMonths",
  "highInterestDebt",
  "lossTolerance",
  "incomeStability",
];

export function getClarificationQuestion(key: string): ClarificationQuestion | null {
  const tpl = CLARIFICATION_QUESTIONS[key];
  if (!tpl) return null;
  return { key, ...tpl };
}
