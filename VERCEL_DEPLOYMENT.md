# FinPath Vercel Hobby 邀请制内测

## 零固定费用配置

- 账号方案：Vercel Hobby，仅用于完全免费的个人内测
- 运行区域：香港 `hkg1`
- 访问地址：Vercel 自动提供的 `vercel.app` 域名
- 持久化：Vercel Private Blob
- 登录：一人一码，可重复登录，首批 10 个
- 文本模型：`deepseek-v4-flash`
- 文档模型：`deepseek-v4-flash-vision-exp`
- 服务端上传上限：4 MB

不购买自定义域名，不启用付费分析、Speed Insights 或额外团队席位。

## 部署步骤

1. 在 Vercel 中导入 GitHub 仓库 `davinci-pm/finpath-financial-agent`。
2. Production Branch 选择 `deployment/vercel-hobby-beta`。
3. Framework Preset 选择 Next.js，构建命令保持 `pnpm build`。
4. 在 Storage 中创建 Private Blob，并连接 Production 环境。
5. 导入生产环境变量后部署。
6. 验收 `/api/health`、邀请码登录、数据隔离和文档识别。

## 生产环境变量

```dotenv
APP_ENV=production
AI_TEXT_PROVIDER=deepseek
AI_DOCUMENT_PROVIDER=deepseek
DEEPSEEK_API_KEY=***
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_MODEL_DOCUMENT=deepseek-v4-flash-vision-exp
MAX_UPLOAD_MB=4
SESSION_SECRET=***
SESSION_DAYS=30
INVITE_CODE_RECORDS=***
BLOB_PREFIX=finpath-beta
```

`BLOB_READ_WRITE_TOKEN` 由 Vercel 连接 Private Blob 后自动注入，不手工提交到 Git。

## 成本保护

- Hobby 超出免费额度后暂停，不启用按量付费。
- 不绑定支付方式，不开启 Pro 试用。
- 上传文件限制 4 MB，PDF 不超过 50 页。
- 仅允许邀请码用户调用业务 API 和模型。
- 每位用户每天最多 12 次文本模型调用、3 次文档识别。
- 使用 Vercel 免费域名，不购买域名、CDN或固定实例。
