import type { DocumentField } from "@/lib/types";
import type { AnalyzeInput, DocumentAnalyzer } from "./analyzer";

/**
 * MockDocumentAnalyzer：测试 / 无视觉模型 Key 时使用。
 * 对固定测试文件返回确定性的提取字段（含页码、原文片段、来源、置信度）。
 * 真实视觉模型（OpenAI 等）接入后仅替换 Provider，接口不变。
 */
export class MockDocumentAnalyzer implements DocumentAnalyzer {
  readonly name = "mock-document-analyzer";

  async analyze(input: AnalyzeInput): Promise<DocumentField[]> {
    // 基于文件名/扩展名返回稳定的测试字段（真实模型接入前用于验证链路）
    if (input.fileName.endsWith(".pdf")) {
      return pdfFields();
    }
    if (/\.(png|jpe?g)$/i.test(input.fileName)) {
      return imageFields();
    }
    return [];
  }
}

const pdfFields = (): DocumentField[] => [
  {
    key: "name",
    label: "产品名称",
    value: "某银行稳健理财（示例）",
    source: "file",
    confidence: 0.98,
    page: 1,
    snippet: "XX银行XX稳健理财产品说明书（示例）",
  },
  {
    key: "type",
    label: "产品类型",
    value: "净值型银行理财",
    source: "file",
    confidence: 0.95,
    page: 1,
    snippet: "本产品为净值型理财产品（示例）",
  },
  {
    key: "term",
    label: "期限",
    value: "约 365 天",
    source: "file",
    confidence: 0.92,
    page: 2,
    snippet: "产品期限：约 365 天（示例）",
  },
  {
    key: "yield",
    label: "展示收益",
    value: "业绩比较基准（示例），非保证收益",
    source: "ai",
    confidence: 0.8,
    page: 2,
    snippet: "业绩比较基准为…不代表实际收益（示例）",
  },
  {
    key: "risk",
    label: "风险等级",
    value: "R2",
    source: "file",
    confidence: 0.9,
    page: 1,
    snippet: "风险等级：R2（示例）",
  },
  {
    key: "early_exit",
    label: "提前退出",
    value: "存续期内不可提前赎回（以合同为准）",
    source: "ai",
    confidence: 0.75,
    page: 3,
    snippet: "存续期内不得提前赎回（示例）",
  },
  {
    key: "fees",
    label: "费用",
    value: "未识别",
    source: "unknown",
    confidence: 0,
    page: null,
    snippet: "",
  },
];

const imageFields = (): DocumentField[] => [
  {
    key: "name",
    label: "产品名称",
    value: "某银行稳健理财（截图示例）",
    source: "ai",
    confidence: 0.7,
    page: null,
    snippet: "截图内容（示例）",
  },
  {
    key: "type",
    label: "产品类型",
    value: "净值型银行理财",
    source: "ai",
    confidence: 0.65,
    page: null,
    snippet: "截图内容（示例）",
  },
  {
    key: "term",
    label: "期限",
    value: "未识别",
    source: "unknown",
    confidence: 0,
    page: null,
    snippet: "",
  },
  {
    key: "risk",
    label: "风险等级",
    value: "未识别",
    source: "unknown",
    confidence: 0,
    page: null,
    snippet: "",
  },
];
