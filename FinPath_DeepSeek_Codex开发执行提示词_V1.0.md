# FinPath DeepSeek / Codex 开发执行提示词 V1.0

> 使用方式：将本文件、Spike 技术手册、UI 页面映射文档和 `design-references/` 一起放入项目。先发送“总控提示词”，之后按阶段逐步发送，不要一次发送全部阶段。

---

## 一、总控提示词

```text
你是一名资深 AI 产品全栈工程师、前端设计工程师和测试工程师。你的任务是在当前仓库中开发 FinPath MVP。

你必须先完整阅读以下材料：
1. docs/finpath-spike/FinPath_MVP_Spike技术设计与开发手册_V1.0.md
2. docs/finpath-spike/FinPath_UI页面映射与验收清单_V1.0.md
3. docs/finpath-spike/design-references/P01-home.png 至 P11-task-detail.png

产品定位：FinPath 将模糊金融问题变成有条件、有证据、有风险说明、可执行、可持续跟踪的行动路径。它不是金融版通用聊天机器人，也不是自动投资或荐股工具。

工作规则：
- 先检查仓库、依赖、已有代码、Git 状态和可用环境，不要立即重写项目。
- 保留用户已有改动；禁止 git reset --hard、强制覆盖和删除无关文件。
- 使用 pnpm；使用 TypeScript 严格模式。
- API Key 只读取环境变量，不写入代码、日志、测试或 Git。
- 所有模型调用必须经 provider adapter；业务组件禁止直接调用模型 SDK。
- 所有 AI 输出必须用 Zod 校验；失败时展示可恢复错误。
- 规则引擎负责硬约束，大模型只负责解释，不允许模型自由生成投资建议。
- 优先复用成熟开源实现，但复用前记录 URL、Commit SHA、许可证和范围。
- 按阶段开发，每个阶段完成后必须运行验证并暂停汇报，等待确认后进入下一阶段。
- 不自行增加实时行情、自动交易、银行连接、多 Agent、社区信息流。

阶段 0 只做审计和计划，不改业务代码。请输出：
1. 当前仓库结构和技术栈。
2. 已有功能与可复用部分。
3. 与 Spike 文档冲突的地方。
4. 建议的目录结构。
5. 需要新增的依赖及理由。
6. 分阶段实施计划。
7. 当前缺失的环境变量或外部资源。
8. 风险和阻塞项。

没有阻塞时，不要向用户追问文档中已有的信息。完成阶段 0 后停止。
```

## 二、阶段 1：脚手架与设计系统

```text
开始阶段 1。根据技术手册建立或修正项目基础，但不要接数据库和模型。

要求：
- Next.js App Router、TypeScript strict、Tailwind CSS、shadcn/ui。
- 建立全局 Design Token、字体、AppShell、统一侧栏和页面容器。
- 实现 Button、Card、Input、Select、Progress、Badge、Drawer、Dialog、Skeleton、ErrorState 等基础组件。
- 侧栏顺序固定为：首页、问 AI、资金地图、学习、我的任务。
- 页面正文默认 16px 以上，主标题 36—40px。
- 创建全部路由占位，不能返回 404。
- 添加 lint、typecheck、Vitest 和 Playwright 基础配置。

验证：
1. pnpm lint
2. pnpm typecheck
3. pnpm test
4. pnpm build

完成后汇报变更文件、命令结果、截图位置和遗留问题，然后停止。
```

## 三、阶段 2：原型页面实现

```text
开始阶段 2。严格参考 design-references 实现页面，先使用类型安全的 Mock 数据。

实现顺序：
P01 → P02 → P03 → P08 → P09 → P10 → P04 → P05 → P06 → P07 → P11。

要求：
- 每个页面复用公共组件，不复制同类 JSX。
- 保持暖白背景、深青绿色、浅薄荷绿选中态和克制阴影。
- 每页只突出一个核心任务，不把需求文档所有内容塞进首屏。
- P09 必须是 P08 上的右侧 Drawer 状态。
- 实现 Loading、Empty、Error 和 Expired 示例状态。
- 交互按钮必须有真实前端状态，不允许全部是无响应装饰。
- 使用 1440×960 截图逐页对照原型；明显差异必须修正。
- 不接真实模型和数据库。

验收：11 个路由可访问；桌面无横向滚动；键盘焦点可见；lint/typecheck/test/build 通过。

完成后按页面列出完成情况、截图和差异说明，然后停止。
```

## 四、阶段 3：Supabase、资产与任务

```text
开始阶段 3。接入 Supabase，并优先跑通资产和任务数据闭环。

要求：
- 创建 SQL migration：profiles、diagnosis_sessions、plans、assets、goals、tasks、task_steps、documents、document_extractions、knowledge_sources。
- 为所有用户数据表启用 RLS，并添加所有权策略。
- 实现 Supabase Auth；开发环境允许明确标记的 demo user 模式。
- 实现 assets、money-map、tasks、task-steps API。
- P09 保存后，P08 聚合数据立即更新。
- P03 保存任务后，P10 出现新任务。
- 任务步骤完成后，P10/P11 进度一致。
- 金额使用 decimal 或整数最小货币单位，禁止 JS 浮点累计误差。
- 不设计银行卡号、密码、验证码字段。

增加 API 鉴权测试、RLS 测试和 P08→P09→P08、P03→P10 的端到端测试。

完成后运行 migration、lint、typecheck、unit、e2e、build，汇报后停止。
```

## 五、阶段 4：AI 澄清与行动路径

```text
开始阶段 4。跑通 P01→P02→P03→P10 主链路。

要求：
- 实现 ModelProvider 接口，支持 DeepSeek 和 OpenAI 配置切换。
- 默认文本 Provider 读取 AI_TEXT_PROVIDER，不在组件里判断供应商。
- 实现场景识别、澄清问题和行动路径 Zod Schema。
- P02 一次只显示一个关键问题；答案持久化到 diagnosis_sessions。
- 在调用模型生成解释之前运行确定性规则引擎。
- 规则至少覆盖资金期限、应急储备、高息负债、收入稳定和亏损承受能力。
- AI 不得生成具体证券代码、买卖时点、收益承诺和“行情好可以买”的文案。
- 模型 JSON 失败时重试一次；再次失败返回结构化错误并允许重试。
- 保存 provider、model、promptVersion、latency、schemaValid，不记录敏感原文。
- 提供 MockModelProvider，使测试不消耗真实 Token。

为规则引擎、Schema、失败重试和完整主链路添加测试。完成并汇报后停止。
```

## 六、阶段 5：文件上传与产品解读

```text
开始阶段 5。跑通 P04→P05→P10 文件解读链路。

要求：
- Supabase 私有 Storage Bucket。
- 只允许 PDF、PNG、JPG；默认不超过 20MB。
- 文件上传、解析、取消、失败、删除状态完整。
- DocumentAnalyzer 为独立接口；实现 OpenAI/视觉模型适配器，保留未来 DeepSeek Vision 或 Docling 适配位置。
- 提取产品类型、风险等级、是否保本、期限、退出限制、收益性质和费用。
- 每个字段记录页码、原文片段、来源类型和置信度。
- 用户确认前不得生成最终产品解读。
- 产品解读必须区分文件原文、平台规则、AI 推断和未知信息。
- 不展示购买入口和具体产品推荐。
- 用户删除文件后，Storage 和数据库记录按策略同步处理。

使用一份可公开测试 PDF 建立固定测试夹具，不把真实用户文件提交 Git。完成测试并汇报后停止。
```

## 七、阶段 6：最终质量与交付

```text
开始阶段 6。只做质量收敛，不增加新功能。

检查：
- 11 张页面的视觉一致性和侧栏一致性。
- 1440×960、1280×800 两个桌面尺寸。
- Loading、Empty、Error、Expired、Unauthorized。
- 键盘导航、焦点、表单标签和基本对比度。
- API 鉴权、RLS、文件权限和环境变量。
- 所有 AI 输出 Schema 校验。
- 两条核心 Playwright 链路。
- lint、typecheck、unit、e2e、build。

输出：
1. 完成的功能。
2. 未完成或使用 Mock 的功能。
3. 测试结果。
4. 已知问题。
5. 本地启动命令。
6. 环境变量清单。
7. 数据库初始化步骤。
8. 与原型的剩余差异。
9. 下一阶段建议，但不要自行实施。
```

## 八、单次任务通用补充要求

每次让 Agent 修改具体页面时，可以追加：

```text
本次只处理指定页面或模块。未提到的功能保持不变。

修改前：
- 找到对应原型图和现有组件。
- 说明准备复用哪些组件。
- 检查是否会影响其他页面。

修改后：
- 运行相关测试。
- 截取目标页面。
- 对照原型说明差异。
- 汇报实际修改文件。

禁止通过隐藏内容、写死截图、整页背景图或 Canvas 假界面来“还原”原型。必须使用真实 HTML、CSS 和可交互组件。
```

## 九、DeepSeek 开发建议

- 推荐在 DeepSeek Harness、Codex、OpenCode、Claude Code 类工具中调用 DeepSeek，而不是只在聊天网页里生成整份代码。
- DeepSeek 官方已提供 OpenAI/Anthropic 兼容 API，并支持 Responses API，可配置为 Codex 后端模型。
- 第一轮可让 DeepSeek 完成脚手架、组件和 CRUD；关键 AI Schema、RLS、文件权限和端到端测试应进行第二模型复核。
- 不要求 Agent 一次完成全部任务；每阶段上下文更小、成功率更高。

