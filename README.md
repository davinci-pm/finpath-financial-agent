# FinPath MVP

把模糊金融问题转换成"有条件、有证据、有风险说明、可执行、可持续跟踪"的行动路径。

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
| `DEEPSEEK_MODEL` | 默认 `deepseek-chat` | 可选 |
| `AI_DOCUMENT_PROVIDER` | `openai`（视觉解析） | 默认 openai |
| `OPENAI_API_KEY` | OpenAI 视觉模型 Key | 真实文件解析时 |
| `OPENAI_MODEL_TEXT` / `OPENAI_MODEL_DOCUMENT` | 备用文本/视觉模型 | 可选 |
| `MAX_UPLOAD_MB` | 文件大小上限，默认 20 | 可选 |
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
pnpm test          # Vitest 单元测试（59 用例）
pnpm test:e2e      # Playwright（52 用例，含 1440×960 截图、1280×800 无溢出、双主链路）
pnpm build         # 生产构建
```

- e2e 强制 `AI_TEXT_PROVIDER=mock`，不消耗真实 Token；webServer 启动时预热核心路由避免首次编译竞争。
- 截图输出在 `screenshots/`（与 `FinPath_前端原型图_P01-P11/` 对照）。

## 两条核心闭环

1. **资金行动路径**：P01 提问 → P02 澄清（一次一问）→ 规则引擎 + 模型解释 → P03 行动路径 → P10 任务 → P08 资金地图。
2. **产品解读**：P04 上传（PDF/PNG/JPG ≤20MB）→ DocumentAnalyzer 提取（来源/置信度/页码/原文）→ 用户确认 → P05 解读 → P10 任务。

## 架构要点

- `lib/server/ai/`：ModelProvider 接口（DeepSeek/OpenAI/Mock）+ Zod Schema + 版本化 Prompt。
- `lib/server/rules/`：确定性规则引擎（硬约束先于模型）。
- `lib/server/documents/`：DocumentAnalyzer 独立接口（与文本模型解耦）。
- `lib/server/repository.ts`：Repository 接口，Supabase / Demo 双实现，按环境自动切换。
- 所有 AI 输出经 Zod 校验，失败重试一次；输出含证券代码/收益承诺/比例越界即拒绝。
- API Key 仅读环境变量，绝不进入代码、日志、测试或 Git。

详见 `FinPath_MVP_Spike技术设计与开发手册_V1.0.md`。
