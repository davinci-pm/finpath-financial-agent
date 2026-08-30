import type {
  ActionPlan,
  Asset,
  ClarificationQuestion,
  DiagnosisSession,
  FinancialRoute,
  Goal,
  LearnNode,
  LearnPath,
  MoneyMap,
  PeerExperience,
  ProductAnalysis,
  ProductDocument,
  Task,
} from "./types";

/**
 * 阶段 2 类型安全 Mock 数据。
 * 金额均为整数（人民币元），避免浮点累计误差。
 * 阶段 3 接入 Supabase 后由 API 返回真实数据替换。
 */

export const SCENARIO_CARDS = [
  {
    title: "钱该怎么安排",
    desc: "闲钱、年终奖，先想清楚怎么放",
    href: "/diagnosis/demo-session",
  },
  {
    title: "产品帮我看懂",
    desc: "上传截图或 PDF，先看懂再决定",
    href: "/documents/new",
  },
  {
    title: "投资怎么开始",
    desc: "从国债、基金入门，不连真实交易",
    href: "/learn/treasury-bonds",
  },
  {
    title: "金融业务怎么办",
    desc: "办卡、换汇、查征信，按步骤走",
    href: "/routes/overseas-payment-card",
  },
] as const;

/* ============ P02 诊断会话 ============ */

export const MOCK_QUESTIONS: ClarificationQuestion[] = [
  {
    key: "horizon",
    question: "这笔钱大概多久以后可能用到？",
    reason: "期限决定资金可以承担多少波动。",
    options: [
      { value: "within_3m", label: "3 个月内" },
      { value: "3m_to_1y", label: "3～12 个月" },
      { value: "1y_to_3y", label: "1～3 年" },
      { value: "no_plan", label: "暂时没有明确计划" },
    ],
    skippable: true,
  },
  {
    key: "emergency",
    question: "你现在的应急储备大概覆盖几个月？",
    reason: "影响是否需要优先补足应急资金。",
    options: [
      { value: "none", label: "还没有储备" },
      { value: "1_3m", label: "1～3 个月" },
      { value: "3_6m", label: "3～6 个月" },
      { value: "6m_plus", label: "6 个月以上" },
    ],
    skippable: true,
  },
  {
    key: "loss_tolerance",
    question: "这笔钱亏多少你能接受？",
    reason: "确定适合的学习区和稳健区比例。",
    options: [
      { value: "none", label: "一点都不能亏" },
      { value: "small", label: "小幅波动可以接受" },
      { value: "medium", label: "短期明显波动可以接受" },
    ],
    skippable: true,
  },
];

export const MOCK_SESSION: DiagnosisSession = {
  id: "demo-session",
  rawQuestion: "我有 3 万元暂时不用，想稳一点，也想学着投资。",
  scenarioType: "money_plan",
  status: "clarifying",
  currentQuestionKey: "horizon",
  answers: { horizon: "1y_to_3y" },
  confirmedConditions: [
    { key: "amount", label: "金额", value: "约 ¥30,000" },
    { key: "goal", label: "目标", value: "稳健增值并学习" },
    { key: "horizon", label: "期限", value: "1～3 年" },
    { key: "emergency", label: "应急储备", value: "待确认" },
    { key: "loss_tolerance", label: "可承受波动", value: "待确认" },
  ],
  updatedAt: "2026-08-29",
};

/* ============ P03 行动路径 ============ */

export const MOCK_PLAN: ActionPlan = {
  id: "demo-plan",
  sessionId: "demo-session",
  conclusion: "这笔钱暂时不适合全部进入高波动资产",
  summary:
    "根据 1～3 年资金期限和当前应急储备情况，可以先拆分资金用途，再决定需要了解的工具。",
  applicableConditions: ["1～3 年资金期限", "应急储备待确认", "可承受小幅波动", "希望学习投资"],
  updatedAt: "2026-08-29",
  buckets: [
    {
      key: "reserve",
      label: "生活缓冲区",
      percentage: 40,
      tag: "优先确认",
      tagline: "流动性与应急用途",
      suitableFor: "覆盖 3～6 个月生活开支，随时可能需要动用。",
      watchOut: "不要投入有锁定期的产品。",
      nextStep: "确认应急资金目标金额",
    },
    {
      key: "stable",
      label: "稳健了解区",
      percentage: 40,
      tag: "适合 1～3 年",
      tagline: "了解存款、国债等类别的期限和风险",
      suitableFor: "1～3 年内用得上、又不想承受大波动的资金。",
      watchOut: "注意起购金额与提前支取规则。",
      nextStep: "了解国债的购买与期限",
    },
    {
      key: "learning",
      label: "小额学习区",
      percentage: 20,
      tag: "不超过承受能力",
      tagline: "通过模拟或可承受的小额资金理解波动",
      suitableFor: "愿意承担波动、用于学习投资体验的资金。",
      watchOut: "亏损可能影响本金，需控制比例。",
      nextStep: "完成基金波动入门卡",
    },
  ],
  actionItems: [
    { id: "a1", title: "确认应急资金目标", done: false },
    { id: "a2", title: "了解国债的购买与期限", done: false },
    { id: "a3", title: "完成基金波动入门卡", done: false },
  ],
  rationale: [
    "资金期限 1～3 年，不适合全部投入高波动资产。",
    "应急储备情况未确认，因此先保留生活缓冲区。",
    "学习区比例建议不超过 20%，且只使用可承受亏损的资金。",
  ],
  sources: [
    { id: "s1", title: "国债发行安排（示例）", type: "official", region: "中国大陆", updatedAt: "2026-08-01" },
    { id: "s2", title: "存款保险制度说明（示例）", type: "official", region: "中国大陆", updatedAt: "2026-07-15" },
    { id: "s3", title: "平台解释：基金波动入门", type: "platform", updatedAt: "2026-08-10" },
  ],
  relatedKnowledge: [
    {
      title: "国债是什么？",
      desc: "国家信用背书、有期限和流动性的债券。",
      href: "/learn/treasury-bonds",
    },
    {
      title: "应急储备应该准备多少？",
      desc: "通常建议覆盖 3～6 个月生活开支。",
      href: "/learn/emergency-fund",
    },
  ],
  peerExperiences: [
    {
      id: "pe1",
      scope: "28 岁·刚工作 2 年",
      region: "上海",
      purpose: "安排 3 万元闲钱",
      duration: "约 2 周",
      materials: ["工资卡", "银行 App"],
      date: "2026-05",
      pitfalls: ["一开始把全部钱放进长期产品，后来要用钱才发现锁定期。"],
    },
  ],
};

/* ============ P08 / P09 资金地图 ============ */

export const MOCK_ASSETS: Asset[] = [
  { id: "as1", kind: "asset", category: "现金与活期", label: "活期存款", amountExact: 24000, currency: "CNY", purpose: "日常开销" },
  { id: "as2", kind: "asset", category: "定期存款", label: "定期存款", amountMin: 20000, amountMax: 30000, currency: "CNY", purpose: "应急储备", maturityDate: "2026-12", liquidity: "到期前不方便使用" },
  { id: "as3", kind: "asset", category: "基金", label: "指数基金", amountExact: 18000, currency: "CNY", purpose: "长期学习" },
  { id: "as4", kind: "asset", category: "黄金", label: "黄金积存", amountExact: 10400, currency: "CNY", purpose: "分散配置" },
  { id: "as5", kind: "asset", category: "其他", label: "现金及其他", amountExact: 9000, currency: "CNY" },
];

export const MOCK_LIABILITIES: Asset[] = [
  { id: "lb1", kind: "liability", category: "贷款", label: "房贷", amountExact: 38000, currency: "CNY", note: "剩余待还（示例）" },
];

export const MOCK_GOALS: Goal[] = [
  { id: "g1", title: "6 个月应急储备", targetAmount: 60000, currentAmount: 32400, progress: 54 },
  { id: "g2", title: "旅行资金", targetAmount: 10000, currentAmount: 7200, progress: 72 },
];

export const MOCK_MONEY_MAP: MoneyMap = {
  totalAssets: 86400,
  totalLiabilities: 38000,
  netAssets: 48400,
  emergencyCoverageMonths: 3.2,
  assets: MOCK_ASSETS,
  liabilities: MOCK_LIABILITIES,
  goals: MOCK_GOALS,
  updatedAt: "2026-08-29",
};

export const ASSET_CATEGORIES = [
  "现金与活期",
  "定期存款",
  "银行理财",
  "国债",
  "基金",
  "股票",
  "黄金",
  "保险",
  "其他",
] as const;

export const LIABILITY_CATEGORIES = ["贷款", "信用卡分期", "其他欠款"] as const;

export const GOAL_CATEGORIES = ["应急储备", "旅行资金", "购房首付", "教育资金", "养老储备"] as const;

/* ============ P10 / P11 任务 ============ */

export const MOCK_TASKS: Task[] = [
  {
    id: "t-overseas-card",
    sourceType: "route",
    sourceId: "overseas-payment-card",
    title: "办理境外支付卡",
    status: "in_progress",
    progressCurrent: 2,
    progressTotal: 7,
    nextAction: "比较境外交易费用",
    updatedAt: "2026-08-29",
    sourceValid: true,
    summary: "办理一张适合旅行与线上订阅的境外支付卡。",
    conditions: [
      { label: "地区", value: "上海" },
      { label: "身份", value: "刚工作" },
      { label: "用途", value: "旅行与线上订阅" },
      { label: "时间", value: "30 天后使用" },
    ],
    materials: ["身份证", "在职证明", "手机号实名"],
    region: "中国大陆 · 上海",
    lastVerifiedAt: "2026-08-29",
    steps: [
      {
        id: "st1",
        position: 1,
        title: "确认支付场景",
        description: "明确境外支付、线上订阅的具体场景。",
        status: "done",
        estimatedMinutes: 5,
        checklist: [
          { id: "c1", label: "列出境外使用场景", done: true },
          { id: "c2", label: "确认币种与额度需求", done: true },
        ],
      },
      {
        id: "st2",
        position: 2,
        title: "比较卡组织与费用",
        description: "比较不同卡组织的货币转换费、年费与取现费用。",
        status: "doing",
        estimatedMinutes: 15,
        checklist: [
          { id: "c3", label: "核对货币转换费率", done: false },
          { id: "c4", label: "核对年费与减免条件", done: false },
          { id: "c5", label: "核对境外取现手续费", done: false },
        ],
        officialEntry: "银行官网费率说明（示例入口）",
      },
      {
        id: "st3",
        position: 3,
        title: "准备申请材料",
        description: "按银行要求准备身份与收入材料。",
        status: "todo",
        estimatedMinutes: 20,
        checklist: [
          { id: "c6", label: "准备身份证原件", done: false },
          { id: "c7", label: "准备在职证明", done: false },
        ],
      },
      {
        id: "st4",
        position: 4,
        title: "开通后完成小额测试",
        description: "先用小额交易验证卡片可用性。",
        status: "todo",
        estimatedMinutes: 10,
        checklist: [
          { id: "c8", label: "完成一笔小额境外交易", done: false },
          { id: "c9", label: "核对账单与汇率", done: false },
        ],
      },
    ],
  },
  {
    id: "t-30k-plan",
    sourceType: "plan",
    sourceId: "demo-plan",
    title: "安排 3 万元闲钱",
    status: "in_progress",
    progressCurrent: 1,
    progressTotal: 4,
    nextAction: "确认应急资金目标",
    updatedAt: "2026-08-29",
    sourceValid: true,
    summary: "按 40/40/20 拆分：生活缓冲区、稳健了解区、小额学习区。",
    steps: [
      { id: "p1", position: 1, title: "确认应急资金目标", description: "确定 3～6 个月生活开支金额。", status: "doing", estimatedMinutes: 10 },
      { id: "p2", position: 2, title: "了解国债的购买与期限", description: "阅读国债入门知识卡。", status: "todo", estimatedMinutes: 15 },
      { id: "p3", position: 3, title: "完成基金波动入门卡", description: "完成学习判断题与模拟决策。", status: "todo", estimatedMinutes: 15 },
      { id: "p4", position: 4, title: "生成最终分配并记录", description: "将分配写入资金地图。", status: "todo", estimatedMinutes: 5 },
    ],
  },
  {
    id: "t-bank-product",
    sourceType: "document",
    sourceId: "doc-bank-product",
    title: "看懂某银行理财产品",
    status: "pending",
    progressCurrent: 0,
    progressTotal: 3,
    nextAction: "等待补充信息",
    updatedAt: "2026-08-28",
    sourceValid: true,
    summary: "待确认产品文件中费率与赎回规则。",
    steps: [
      { id: "b1", position: 1, title: "确认文件字段", description: "确认 AI 提取的产品字段。", status: "todo", estimatedMinutes: 5 },
      { id: "b2", position: 2, title: "生成产品解读", description: "生成结构化解读与风险说明。", status: "todo", estimatedMinutes: 5 },
      { id: "b3", position: 3, title: "决定是否保存到资金地图", description: "确认后写入资产档案。", status: "todo", estimatedMinutes: 5 },
    ],
  },
  {
    id: "t-done-1",
    sourceType: "manual",
    sourceId: "manual-1",
    title: "开通电子社保卡",
    status: "completed",
    progressCurrent: 3,
    progressTotal: 3,
    nextAction: "已完成",
    updatedAt: "2026-08-20",
    sourceValid: true,
    steps: [],
  },
  {
    id: "t-done-2",
    sourceType: "manual",
    sourceId: "manual-2",
    title: "设置自动转账储蓄",
    status: "completed",
    progressCurrent: 2,
    progressTotal: 2,
    nextAction: "已完成",
    updatedAt: "2026-08-15",
    sourceValid: true,
    steps: [],
  },
];

export const MOCK_TASK_DETAIL = MOCK_TASKS[0];

export const MOCK_PEER_EXPERIENCES: PeerExperience[] = [
  {
    id: "pe11",
    scope: "26 岁·刚工作",
    region: "上海",
    purpose: "办理境外支付卡用于旅行",
    duration: "约 3 周",
    materials: ["身份证", "在职证明"],
    date: "2026-06",
    pitfalls: ["没提前比较货币转换费，第一笔境外消费多付了约 2%。", "卡片寄到后被要求补充收入材料，多等了一周。"],
  },
  {
    id: "pe12",
    scope: "30 岁·自由职业",
    region: "杭州",
    purpose: "线上订阅境外服务",
    duration: "约 10 天",
    materials: ["身份证", "银行流水"],
    date: "2026-04",
    pitfalls: ["自由职业需要提供流水代替在职证明。", "部分平台要求开启境外无卡交易，需电话确认。"],
  },
];

/* ============ P04 / P05 产品文档 ============ */

export const MOCK_DOCUMENT: ProductDocument = {
  id: "doc-bank-product",
  fileName: "某银行稳健理财产品说明.pdf",
  mimeType: "application/pdf",
  sizeBytes: 842137,
  status: "awaiting_confirmation",
  fields: [
    { key: "name", label: "产品名称", value: "某银行稳健理财（示例）", source: "file", confidence: 0.98 },
    { key: "type", label: "产品类型", value: "净值型银行理财", source: "file", confidence: 0.95 },
    { key: "term", label: "期限", value: "约 365 天", source: "file", confidence: 0.92 },
    { key: "yield", label: "展示收益", value: "业绩比较基准（示例），非保证收益", source: "ai", confidence: 0.8 },
    { key: "risk", label: "风险等级", value: "R2", source: "file", confidence: 0.9 },
    { key: "early_exit", label: "提前退出", value: "存续期内不可提前赎回（以合同为准）", source: "ai", confidence: 0.75 },
    { key: "fees", label: "费用", value: "未识别", source: "unknown", confidence: 0 },
  ],
};

export const MOCK_PRODUCT_ANALYSIS: ProductAnalysis = {
  documentId: "doc-bank-product",
  conclusion: "它不是保本存款",
  productType: "净值型银行理财（示例）",
  markers: [
    { label: "本金可能波动", tone: "warning" },
    { label: "期限约 365 天", tone: "info" },
    { label: "提前退出受限", tone: "warning" },
  ],
  keyPoints: [
    { title: "它靠什么产生收益", text: "产品投资于债券等资产，净值随市场波动，收益来自资产价格与票息。" },
    { title: "展示收益不等于实际收益", text: "业绩比较基准只是目标区间，不构成收益承诺。" },
    { title: "资金有锁定期", text: "约 365 天存续期内通常不可提前赎回。" },
    { title: "可能产生费用", text: "管理费、托管费等会在净值中体现，需查看合同明细。" },
    { title: "最差情况下需要承担什么", text: "本金可能出现亏损，且不可提前退出，需用长期闲置资金。" },
  ],
  keyInfo: [
    { label: "风险等级", value: "R2（较低风险，非保本）", source: "file" },
    { label: "期限", value: "约 365 天", source: "file" },
    { label: "起购金额", value: "1 万元（示例）", source: "file" },
    { label: "申购赎回", value: "到期自动赎回（示例），不可提前退出", source: "ai" },
    { label: "管理费", value: "以产品合同为准（待核验）", source: "unknown" },
    { label: "信息缺失项", value: "销售服务费、业绩报酬条款", source: "unknown" },
  ],
  questionsToAsk: [
    "这款产品的实际费率是多少？管理费、托管费、销售费分别是多少？",
    "如果提前退出，会有什么费用或损失？",
    "业绩比较基准是如何计算的？历史上达到过吗？",
    "这个产品和同期限存款相比，风险差异在哪里？",
  ],
  comparisons: [
    { title: "与存款比较", text: "存款受存款保险保障，理财不保本；理财收益预期更高但波动更大。" },
    { title: "与国债比较", text: "国债有国家信用背书，风险极低；理财的收益与风险介于存款和股票之间。" },
    { title: "适合什么期限的资金", text: "适合 1 年以上、确定不会提前动用的闲置资金。" },
  ],
  sources: [
    { id: "ds1", title: "产品说明书原文（示例）", type: "file", updatedAt: "2026-08-29" },
    { id: "ds2", title: "银行理财销售管理办法（示例）", type: "official", region: "中国大陆", updatedAt: "2026-07-01" },
    { id: "ds3", title: "平台解释：净值型理财入门", type: "platform", updatedAt: "2026-08-10" },
  ],
};

/* ============ P06 学习 ============ */

export const MOCK_LEARN_PATH: LearnPath = {
  slug: "treasury-bonds",
  title: "用 12 分钟，看懂第一次买国债前最重要的事",
  subtitle: "学习与模拟，不连接真实交易",
  durationMinutes: 12,
  nodes: [
    { slug: "what-is", title: "国债是什么", status: "done" },
    { slug: "term-liquidity", title: "期限与流动性", status: "current" },
    { slug: "rate-price", title: "利率与价格", status: "todo" },
    { slug: "how-to-buy", title: "怎么买与怎么持有", status: "todo" },
    { slug: "simulate", title: "模拟一次选择", status: "todo" },
  ],
  willLearn: ["识别国债与存款的区别", "理解期限和流动性的关系", "知道购买前要确认的条件"],
};

export const MOCK_LEARN_NODE: LearnNode = {
  slug: "term-liquidity",
  title: "为什么国债也有期限和价格变化？",
  position: 2,
  total: 5,
  scenario:
    "你一年后可能要用一笔钱，现在看到一款 3 年期国债。在购买之前，你应该先确认什么？",
  question: "先确认什么？",
  options: [
    { value: "yield_only", label: "只看收益率高低" },
    { value: "term_and_liquidity", label: "确认期限与自己用钱时间是否匹配" },
    { value: "buy_immediately", label: "立即购买，避免错过额度" },
  ],
};

/* ============ P07 金融办事路线 ============ */

export const MOCK_ROUTE: FinancialRoute = {
  id: "overseas-payment-card",
  title: "境外支付卡办理路线",
  conditions: [{ label: "上海" }, { label: "刚工作" }, { label: "用于旅行与线上订阅" }, { label: "30 天后使用" }],
  status: "in_progress",
  completedCount: 2,
  totalCount: 7,
  steps: [
    {
      id: "r1",
      position: 1,
      title: "确认支付场景",
      status: "done",
      description: "列出境外支付与线上订阅的具体场景。",
      estimatedMinutes: 5,
      checklist: [
        { id: "rc1", label: "列出境外使用场景", done: true },
        { id: "rc2", label: "确认币种与额度需求", done: true },
      ],
    },
    {
      id: "r2",
      position: 2,
      title: "比较卡组织与费用",
      status: "current",
      description: "比较不同卡组织的货币转换费、年费与取现费用。",
      estimatedMinutes: 15,
      checklist: [
        { id: "rc3", label: "核对货币转换费率", done: false },
        { id: "rc4", label: "核对年费与减免条件", done: false },
        { id: "rc5", label: "核对境外取现手续费", done: false },
      ],
      officialEntry: "银行官网费率说明（示例入口）",
    },
    {
      id: "r3",
      position: 3,
      title: "准备申请材料",
      status: "todo",
      description: "按银行要求准备身份与收入材料。",
      estimatedMinutes: 20,
      checklist: [
        { id: "rc6", label: "准备身份证原件", done: false },
        { id: "rc7", label: "准备在职证明", done: false },
      ],
    },
    {
      id: "r4",
      position: 4,
      title: "开通后完成小额测试",
      status: "todo",
      description: "先用小额交易验证卡片可用性。",
      estimatedMinutes: 10,
      checklist: [
        { id: "rc8", label: "完成一笔小额境外交易", done: false },
        { id: "rc9", label: "核对账单与汇率", done: false },
      ],
    },
  ],
  materials: ["身份证", "在职证明", "手机号实名"],
  possibleFees: ["年费（部分卡可减免，需核验）", "货币转换费", "境外取现手续费"],
  failureReasons: ["收入材料不充分", "征信存在逾期记录", "申请信息与实名不一致"],
  alternatives: ["先使用现有借记卡境外消费", "选择免年费的入门卡"],
  region: "中国大陆 · 上海",
  updatedAt: "2026-08-29",
};
