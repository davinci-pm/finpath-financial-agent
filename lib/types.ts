/**
 * FinPath 领域类型（对齐《技术手册》§8 数据模型）
 * 阶段 2 使用类型安全 Mock 数据，阶段 3 起平滑替换为 Supabase 查询结果。
 */

/* ============ 通用 ============ */

export type ScenarioType =
  | "money_plan"
  | "product_explain"
  | "financial_route"
  | "learning"
  | "other";

/** 来源类型：官方信息 / 平台解释 / 个人经验 / 文件原文 / AI 推断 / 未识别 */
export type SourceType = "official" | "platform" | "personal" | "file" | "ai" | "unknown";

export type Source = {
  id: string;
  title: string;
  type: SourceType;
  region?: string;
  updatedAt: string;
};

/* ============ 诊断与澄清（P02） ============ */

export type ClarificationOption = {
  value: string;
  label: string;
};

export type ClarificationQuestion = {
  key: string;
  question: string;
  reason: string;
  options: ClarificationOption[];
  skippable: boolean;
};

export type DiagnosisSession = {
  id: string;
  rawQuestion: string;
  scenarioType: ScenarioType;
  status: "clarifying" | "completed";
  currentQuestionKey: string | null;
  answers: Record<string, string>;
  /** 已确认条件摘要（右侧卡片） */
  confirmedConditions: Array<{ key: string; label: string; value: string }>;
  updatedAt: string;
};

/* ============ 行动路径（P03） ============ */

export type PlanBucketKey = "reserve" | "stable" | "learning";

export type PlanBucket = {
  key: PlanBucketKey;
  label: string;
  percentage: number;
  tag: string;
  tagline: string;
  suitableFor: string;
  watchOut: string;
  nextStep: string;
};

export type ActionPlan = {
  id: string;
  sessionId: string;
  conclusion: string;
  summary: string;
  applicableConditions: string[];
  updatedAt: string;
  buckets: PlanBucket[];
  actionItems: Array<{ id: string; title: string; done: boolean }>;
  rationale: string[];
  sources: Source[];
  relatedKnowledge: Array<{ title: string; desc: string; href: string }>;
  peerExperiences: PeerExperience[];
};

/* ============ 资金地图（P08 / P09） ============ */

export type AssetKind = "asset" | "liability" | "goal";

export type Asset = {
  id: string;
  kind: AssetKind;
  category: string;
  label: string;
  /** 金额区间（min/max）或精确金额，人民币，避免浮点 */
  amountMin?: number;
  amountMax?: number;
  amountExact?: number;
  currency: "CNY";
  purpose?: string;
  maturityDate?: string;
  liquidity?: string;
  note?: string;
};

export type Goal = {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  progress: number; // 0-100
};

export type MoneyMap = {
  totalAssets: number;
  totalLiabilities: number;
  netAssets: number;
  emergencyCoverageMonths: number;
  assets: Asset[];
  liabilities: Asset[];
  goals: Goal[];
  updatedAt: string;
};

/* ============ 任务（P10 / P11） ============ */

export type TaskStatus = "in_progress" | "pending" | "completed";
export type TaskStepStatus = "todo" | "doing" | "done";

export type TaskStep = {
  id: string;
  position: number;
  title: string;
  description?: string;
  status: TaskStepStatus;
  estimatedMinutes?: number;
  checklist?: Array<{ id: string; label: string; done: boolean }>;
  officialEntry?: string;
};

export type Task = {
  id: string;
  sourceType: "plan" | "document" | "route" | "manual";
  sourceId: string;
  title: string;
  status: TaskStatus;
  progressCurrent: number;
  progressTotal: number;
  nextAction: string;
  steps: TaskStep[];
  updatedAt: string;
  sourceValid: boolean;
  summary?: string;
  conditions?: Array<{ label: string; value: string }>;
  materials?: string[];
  region?: string;
  lastVerifiedAt?: string;
};

/* ============ 产品文档与解读（P04 / P05） ============ */

export type DocumentStatus =
  | "uploading"
  | "analyzing"
  | "awaiting_confirmation"
  | "ready"
  | "failed";

/** 提取字段：值 + 来源类型 + 置信度 + 页码 + 原文片段（手册 §11.2） */
export type DocumentField = {
  key: string;
  label: string;
  value: string;
  source: "file" | "ai" | "unknown";
  confidence?: number; // 0-1
  page?: number | null;
  snippet?: string; // 原文片段
};

export type ProductDocument = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  status: DocumentStatus;
  fields: DocumentField[];
};

/** 提取与确认记录（P04 确认前不得生成解读） */
export type ExtractionRecord = {
  documentId: string;
  fields: DocumentField[];
  confirmedFields: Record<string, string>;
  status: "extracted" | "confirmed";
  createdAt: string;
  updatedAt: string;
};

export type ProductAnalysis = {
  documentId: string;
  conclusion: string;
  productType: string;
  markers: Array<{ label: string; tone: "warning" | "info" }>;
  keyPoints: Array<{ title: string; text: string }>;
  keyInfo: Array<{ label: string; value: string; source: SourceType }>;
  questionsToAsk: string[];
  comparisons: Array<{ title: string; text: string }>;
  sources: Source[];
};

/* ============ 学习（P06） ============ */

export type LearnPath = {
  slug: string;
  title: string;
  subtitle: string;
  durationMinutes: number;
  nodes: Array<{ slug: string; title: string; status: "done" | "current" | "todo" }>;
  willLearn: string[];
};

export type LearnNode = {
  slug: string;
  title: string;
  position: number;
  total: number;
  scenario: string;
  question: string;
  options: ClarificationOption[];
};

/* ============ 金融办事路线（P07） ============ */

export type RouteStep = {
  id: string;
  position: number;
  title: string;
  status: "done" | "current" | "todo";
  description: string;
  estimatedMinutes: number;
  checklist: Array<{ id: string; label: string; done: boolean }>;
  officialEntry?: string;
};

export type FinancialRoute = {
  id: string;
  title: string;
  conditions: Array<{ label: string }>;
  status: "in_progress" | "pending" | "completed";
  completedCount: number;
  totalCount: number;
  steps: RouteStep[];
  materials: string[];
  possibleFees: string[];
  failureReasons: string[];
  alternatives: string[];
  region: string;
  updatedAt: string;
};

/* ============ 相似经验（P11） ============ */

export type PeerExperience = {
  id: string;
  scope: string;
  region: string;
  purpose: string;
  duration: string;
  materials: string[];
  date: string;
  pitfalls: string[];
};

/* ============ 诊断会话与计划（阶段 4） ============ */

export type DiagnosisRecord = {
  id: string;
  rawQuestion: string;
  scenarioType: ScenarioType;
  status: "clarifying" | "completed";
  currentQuestionKey: string | null;
  answers: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

export type PlanRecord = {
  id: string;
  sessionId: string;
  conclusion: string;
  summary: string;
  hardConstraints: string[];
  buckets: PlanBucket[];
  actionItems: Array<{ id: string; title: string; done: boolean }>;
  risks: string[];
  sourceIds: string[];
  disclaimer: string;
  rationale: string[];
  updatedAt: string;
};
