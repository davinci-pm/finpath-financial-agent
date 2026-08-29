# FinPath MVP 开发启动包 V1.0

本启动包用于让 DeepSeek、Codex 或其他具备终端和文件操作能力的 Coding Agent，按照已经确认的 FinPath 原型图开发第一版可运行 MVP。

## 文件说明

- `FinPath_MVP_Spike技术设计与开发手册_V1.0.md`：技术决策、架构、数据库、API、AI、知识库、测试和验收标准。
- `FinPath_DeepSeek_Codex开发执行提示词_V1.0.md`：可以直接复制给 Coding Agent 的分阶段执行提示词。
- `FinPath_UI页面映射与验收清单_V1.0.md`：11 张原型图、路由、组件、状态与验收要求。
- `design-references/`：P01—P11 最终确认版页面图片。

## 推荐使用顺序

1. 将整个目录放入 FinPath 项目根目录的 `docs/finpath-spike/`。
2. 把技术文档和全部原型图提供给 Coding Agent。
3. 首次只发送开发提示词中的“总控提示词”。
4. 要求 Agent 先完成阶段 0 的仓库审计与实施计划，不允许立即开发全部页面。
5. 按阶段 1—6 逐步执行，每阶段验收后再继续。

## 默认技术方案

- Next.js App Router + TypeScript
- Tailwind CSS + shadcn/ui + Radix UI
- Supabase PostgreSQL + Auth + Storage
- Vercel AI SDK
- DeepSeek 文本模型，可切换 OpenAI
- OpenAI 或其他视觉模型作为 PDF/图片解析适配器
- Vitest + Playwright

## 最重要的开发原则

第一版只优先跑通两条闭环：

1. 提问 → 澄清 → 行动路径 → 保存任务 → 资金地图。
2. 上传产品文件 → 字段确认 → 产品解读 → 保存检查任务。

P06、P07、P11 可以先完成静态页面和种子数据，不得因为追求“功能齐全”而阻塞核心闭环。

