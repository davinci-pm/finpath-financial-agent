# FinPath MVP

把模糊金融问题转换成"有条件、有证据、有风险说明、可执行、可持续跟踪"的行动路径。

[![License: MIT](https://img.shields.io/badge/License-MIT-276B5D.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)

在线内测：[finpath-financial-agent.vercel.app](https://finpath-financial-agent.vercel.app)（需要邀请码）

## 为什么不是普通聊天机器人

- **财务决策工作台**：资产、负债、现金流和目标共同参与可解释的健康评分。
- **情景推演**：即时计算一次性支出或月度收支变化后的现金轨迹，不消耗模型额度。
- **月度现金流**：手动记录或 CSV 批量导入，支持分类汇总和安全导出。
- **产品文档解读与对比**：识别 PDF/图片中的期限、风险、费用和退出条件，确认后才生成解读。
- **规则先于模型**：硬约束由确定性规则计算，AI 负责解释和生成行动步骤。
- **行动闭环**：结论可以保存为任务，持续记录完成进度。

## 本地启动

```bash
pnpm install          # 安装依赖
pnpm dev              # 开发服务器 http://localhost:3000
```

无任何环境变量时，应用以 **Demo 模式**运行（内存数据 + Mock 模型），两条核心闭环可直接体验与测试。

## 环境变量（`.env.local`，不提交 Git）

| 变量 | 用途 | 必需 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目地址 | 接入真实数据库时 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | 同上 |
| `SUPABASE_SERVICE_ROLE_KEY` | 服务端特权 key（仅服务端） | 同上 |
| `AI_TEXT_PROVIDER` | `deepseek` / `openai` / `mock` | 默认 deepseek |
| `DEEPSEEK_API_KEY` | DeepSeek 文本模型 Key | 真实 AI 澄清时 |
| `DEEPSEEK_BASE_URL` | 默认 `https://api.deepseek.com` | 可选 |
| `DEEPSEEK_MODEL` | 默认 `deepseek-v4-flash` | 可选 |
| `DEEPSEEK_MODEL_DOCUMENT` | 默认 `deepseek-v4-flash-vision-exp` | 可选 |
| `AI_DOCUMENT_PROVIDER` | `deepseek` / `openai` | 默认 deepseek |
| `OPENAI_API_KEY` | OpenAI 备用模型 Key | 使用 OpenAI 时 |
| `OPENAI_MODEL_TEXT` / `OPENAI_MODEL_DOCUMENT` | 备用文本/视觉模型 | 可选 |
| `MAX_UPLOAD_MB` | 文件大小上限，默认 4 | 可选 |
| `APP_ENV` | `development` / `production` | 可选 |

## 数据库初始化（接入 Supabase 时）

1. 在 Supabase 创建项目，将三个 `SUPABASE_*` 变量写入 `.env.local`。
2. 应用迁移（二选一）：
   - SQL 编辑器：粘贴执行 `supabase/migrations/0001_init.sql`；
   - CLI：`supabase db push`（需 supabase CLI 与项目链接）。
3. 重启 `pnpm dev`，`getRepository()` 自动切换到 SupabaseRepository（RLS 生效，未登录返回 401）。

> 迁移包含 11 张表 + RLS 策略 + demo profile 种子。金额一律 bigint 整数元；不含银行卡号/密码/验证码/身份证字段。

## 测试

```bash
pnpm lint          # ESLint
pnpm typecheck     # TypeScript strict
pnpm test          # Vitest 单元与规则测试（398 用例）
pnpm test:e2e      # Playwright（105 用例，含桌面截图、移动端、API 边界与双主链路）
pnpm build         # 生产构建
```

- e2e 强制 `AI_TEXT_PROVIDER=mock`，不消耗真实 Token；webServer 启动时预热核心路由避免首次编译竞争。
- 截图输出在 `screenshots/`（与 `FinPath_前端原型图_P01-P11/` 对照）。

## 三条核心闭环

1. **资金行动路径**：提问 → 一次一问澄清 → 规则引擎 + 模型解释 → 行动路径 → 任务 → 资金地图。
2. **产品解读**：上传 PDF/PNG/JPG → 提取来源/置信度/页码/原文 → 用户确认 → 解读或双文档对比 → 任务。
3. **决策复盘**：现金流记录 → 财务体检 → 情景推演 → 下一步行动 → 持续更新。

## 架构要点

- `lib/server/ai/`：ModelProvider 接口（DeepSeek/OpenAI/Mock）+ Zod Schema + 版本化 Prompt。
- `lib/server/rules/`：确定性规则引擎（硬约束先于模型）。
- `lib/server/documents/`：DocumentAnalyzer 独立接口（与文本模型解耦）。
- `lib/server/repository.ts`：Repository 接口，Vercel Blob / Supabase / Demo 三种实现，按环境自动切换。
- 所有 AI 输出经 Zod 校验，失败重试一次；输出含证券代码/收益承诺/比例越界即拒绝。
- API Key 仅读环境变量，绝不进入代码、日志、测试或 Git。

详见 `FinPath_MVP_Spike技术设计与开发手册_V1.0.md`。

## 安全与免责声明

- 不要把 `.env.local`、邀请码、API Key 或生产数据提交到 Git。
- FinPath 提供金融教育、信息整理和行动辅助，不构成投资、证券、保险或法律建议。
- 发现安全问题时，请不要在公开 Issue 中披露密钥或个人财务数据。

## 开源许可证

项目源代码采用 [MIT License](LICENSE)。第三方代码与设计参考见
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
