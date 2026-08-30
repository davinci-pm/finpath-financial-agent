import type { DocumentField, ProductAnalysis, SourceType } from "@/lib/types";

/**
 * 产品解读生成器（确定性模板，基于用户确认后的字段）。
 * 无模型调用：结论、关键点、待确认问题均由字段规则映射，可测试、可复现。
 * 所有来源标注区分：文件原文 / AI 推断 / 未识别。
 */

const FIELD_LABELS: Record<string, string> = {
  name: "产品名称",
  type: "产品类型",
  term: "期限",
  yield: "展示收益",
  risk: "风险等级",
  guaranteed: "是否保本",
  early_exit: "提前退出",
  fees: "费用",
  min_purchase: "起购金额",
};

function sourceType(field: DocumentField): SourceType {
  return field.source;
}

export function generateReport(
  docId: string,
  confirmed: Record<string, string>,
  fields: DocumentField[],
): ProductAnalysis {
  // 合并确认值与原始字段信息
  const merged: DocumentField[] = fields.map((f) => ({
    ...f,
    value: confirmed[f.key] ?? f.value,
  }));
  const get = (key: string) => merged.find((f) => f.key === key);

  const type = get("type")?.value ?? "金融产品";
  const guaranteed = get("guaranteed")?.value;
  const term = get("term")?.value;
  const earlyExit = get("early_exit")?.value;
  const fees = get("fees")?.value;

  const isGuaranteed =
    guaranteed === "是" || guaranteed === "保本" || guaranteed?.includes("保本");

  const markers: ProductAnalysis["markers"] = [];
  if (isGuaranteed) {
    markers.push({ label: "保本（以合同为准）", tone: "info" });
  } else if (guaranteed && guaranteed !== "未识别") {
    markers.push({ label: "不保本 · 本金可能波动", tone: "warning" });
  }
  if (term && term !== "未识别") markers.push({ label: `期限约 ${term}`, tone: "info" });
  if (earlyExit && earlyExit !== "未识别") markers.push({ label: "提前退出受限", tone: "warning" });

  const keyPoints: ProductAnalysis["keyPoints"] = [
    {
      title: "它靠什么产生收益",
      text: isGuaranteed
        ? "产品给出固定或保本承诺（以合同为准），收益结构相对简单。"
        : `产品投资于债券等资产，净值随市场波动，收益来自资产价格与票息。`,
    },
    {
      title: "展示收益不等于实际收益",
      text: "业绩比较基准/展示收益只是目标区间，不构成收益承诺。",
    },
    {
      title: "资金有锁定期",
      text: earlyExit && earlyExit !== "未识别"
        ? `${earlyExit}，需要用确定期限内不动的资金。`
        : "需确认锁定期与提前赎回条件后再投入。",
    },
    {
      title: "可能产生费用",
      text: fees && fees !== "未识别"
        ? `已识别费用：${fees}。实际以合同明细为准。`
        : "管理费、托管费、销售费等会在净值中体现，需查看合同明细。",
    },
    {
      title: "最差情况下需要承担什么",
      text: isGuaranteed
        ? "即使保本，也可能损失利息机会成本；仍需核验合同条款。"
        : "本金可能出现亏损，且可能无法提前退出，需用长期闲置资金。",
    },
  ];

  const keyInfo: ProductAnalysis["keyInfo"] = merged
    .filter((f) => f.value && f.value !== "未识别")
    .map((f) => ({
      label: FIELD_LABELS[f.key] ?? f.label,
      value: f.value,
      source: sourceType(f),
    }));

  const unknownFields = merged
    .filter((f) => !f.value || f.value === "未识别")
    .map((f) => FIELD_LABELS[f.key] ?? f.label);

  const questionsToAsk = [
    ...unknownFields.map((label) => `${label}具体是多少？请提供合同原文或询问销售人员。`),
    `这款产品的实际费率是多少？管理费、托管费、销售费分别是多少？`,
    `如果提前退出，会有什么费用或损失？`,
    `业绩比较基准是如何计算的？历史上达到过吗？`,
    `这个产品和同期限存款相比，风险差异在哪里？`,
  ].slice(0, 4);

  const fileName = fields.find((f) => f.key === "name")?.snippet || "产品说明书原文（示例）";

  return {
    documentId: docId,
    conclusion: isGuaranteed ? "它是保本产品（以合同为准）" : "它不是保本存款",
    productType: type,
    markers,
    keyPoints,
    keyInfo,
    questionsToAsk,
    comparisons: [
      { title: "与存款比较", text: "存款受存款保险保障；非保本理财的收益预期更高但波动更大。" },
      { title: "与国债比较", text: "国债有国家信用背书，风险极低；理财的收益与风险介于存款和股票之间。" },
      { title: "适合什么期限的资金", text: `适合${term && term !== "未识别" ? `约 ${term}` : "与产品期限匹配"}、确定不会提前动用的闲置资金。` },
    ],
    sources: [
      { id: `doc-${docId}`, title: `${fileName}`, type: "file", updatedAt: "2026-08-29" },
      { id: "platform-rule", title: "平台解释：净值型理财入门", type: "platform", updatedAt: "2026-08-10" },
    ],
  };
}
