# FinPath 火山引擎邀请制内测部署说明

## 目标配置

- 地域：华北 2（北京）
- 访问入口：火山引擎 Serverless API 网关提供的公网地址
- 运行：veFaaS 弹性实例，最小实例数 0，最大实例数 1
- 数据与文件：TOS 私有桶，不使用常驻数据库
- 登录：一人一码；同一码可重复登录；首批 10 个；有效期 310 天
- 文本模型：`deepseek-v4-flash`
- 文档模型：`deepseek-v4-flash-vision-exp`

## 架构

```text
浏览器
  │ HTTPS
  ▼
Serverless API 网关
  │
  ▼
veFaaS / Next.js standalone
  ├─ 邀请码校验 + HttpOnly 会话 Cookie
  ├─ DeepSeek V4 Flash（文本）
  ├─ DeepSeek V4 Flash Vision（图片文档）
  └─ TOS 私有桶
       ├─ users/<user-id>/state.json
       └─ users/<user-id>/documents/<document-id>/source
```

金融数据按邀请码对应的固定用户 ID 隔离。TOS 写入使用 ETag 条件更新，配合最大实例数 1，减少首批内测阶段的并发覆盖风险。

## 上线顺序

1. 在华北 2（北京）创建 Serverless API 网关 `finpath-beta-gw`，开启公网访问。
2. 创建 TOS 私有桶：禁止匿名访问，开启默认服务端加密与版本控制。
3. 为运行时创建最小权限访问凭证，仅允许访问指定桶的 `finpath-beta/` 前缀。
4. 使用 `vefaas deploy --newApp` 创建应用并绑定已确认的网关。
5. 导入生产环境变量，再执行正式发布。
6. 设置端口 `3000`，启动命令 `node server.js`，健康检查 `/api/health`。
7. 设置弹性策略：最小实例数 `0`、最大实例数 `1`；不配置预留实例。
8. 依次验收健康检查、匿名拦截、邀请码登录、数据隔离、文件上传和模型识别。

## 构建配置

- 安装：`pnpm install --frozen-lockfile`
- 构建：`pnpm build:vefaas`
- 产物：`.next/standalone`
- 启动：`node server.js`
- 端口：`3000`
- Node.js：20.x（已验证依赖可加载）

## 生产环境变量

以下值只进入 veFaaS 加密环境变量，不进入 Git：

```dotenv
APP_ENV=production
AI_TEXT_PROVIDER=deepseek
AI_DOCUMENT_PROVIDER=deepseek
DEEPSEEK_API_KEY=***
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_MODEL_DOCUMENT=deepseek-v4-flash-vision-exp
MAX_UPLOAD_MB=20
SESSION_SECRET=***
SESSION_DAYS=30
INVITE_CODE_RECORDS=***
TOS_ACCESS_KEY_ID=***
TOS_SECRET_ACCESS_KEY=***
TOS_BUCKET=***
TOS_REGION=cn-beijing
TOS_ENDPOINT=tos-cn-beijing.volces.com
TOS_PREFIX=finpath-beta
```

邀请码的生产变量只保存 SHA-256 哈希，不保存邀请码明文。邀请码明文保存在被 Git 忽略且权限为 `600` 的本地交付文件中。

## 文档识别说明

- JPG/PNG/WebP/GIF：直接发送给 DeepSeek V4 Flash Vision。
- 文本型 PDF：在服务端逐页提取文字，再交给模型结构化识别。
- 扫描型 PDF：若没有可提取文字，提示用户转为 JPG/PNG 后上传。
- 单文件默认不超过 20 MB，PDF 不超过 50 页。

## 验收清单

- `GET /api/health` 返回 200。
- 未登录访问页面跳转 `/login`。
- 未登录访问业务 API 返回 401。
- 错误或过期邀请码无法登录。
- 正确邀请码可重复登录并签发 `HttpOnly` Cookie。
- 两个邀请码的数据互不可见。
- TOS 桶和对象均不可匿名读取。
- 上传图片后使用 `deepseek-v4-flash-vision-exp` 返回字段、置信度、页码和原文片段。
- 冷启动、错误率和模型调用失败均可从 veFaaS 日志定位。

## 回滚

代码保存在 `deployment/volcengine-invite-beta` 分支。若线上版本异常，优先在 veFaaS 回滚到上一稳定版本；不要删除 TOS 数据桶。回滚后重新执行健康检查和登录检查。
