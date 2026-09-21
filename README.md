# 越海 · 跨境电商 AI 知识助手

基于 [Dify 官方 Text Generator Web App 模板](https://github.com/langgenius/webapp-text-generator)制作的面试 Demo。保留模板的 Dify Workflow、流式响应和请求处理能力，提供中文提问与 Markdown 回答界面。

## 本地运行

需要 Node.js 20 或更新版本。复制 `.env.example` 为 `.env.local`，填写 Dify Workflow Service API 配置：

```env
DIFY_API_URL=https://api.dify.ai/v1
DIFY_API_KEY=app-your-secret-key
```

然后运行：

```bash
npm ci
npm run dev
```

打开 <http://localhost:3000>。发布前运行 `npm run build`。

## 服务端安全边界

`DIFY_API_URL` 和 `DIFY_API_KEY` 只由 Next.js 服务端模块读取。不要给密钥变量添加公开前缀，也不要在客户端代码中读取或传递密钥。

浏览器只访问当前站点的接口：

- `/api/parameters` 获取 Workflow 输入参数。
- `/api/workflows/run` 发起 Workflow 流式请求。
- `/api/file-upload`、`/api/messages` 和反馈接口继续由 Next.js Route Handler 代理。

这些 Route Handler 在服务端使用 `dify-client` 请求 `DIFY_API_URL`，由服务端添加 Dify API Key。浏览器不会直接访问 `api.dify.ai`，也不会收到 Dify `Authorization` 请求头。

Dify Workflow Service API Key 已绑定应用，因此不需要单独的 App ID。当前项目固定使用 Workflow 模式，也不需要额外的应用类型环境变量。真实值只放在 `.env.local`；该文件已被 Git 忽略，`.env.example` 不包含密钥。

## 部署到 Vercel

将仓库推送到 GitHub，在 [Vercel 新建项目](https://vercel.com/new)中导入仓库。Framework Preset 选择 Next.js，使用默认安装和 `npm run build` 命令。

在 Vercel 项目的 **Settings → Environment Variables** 中只配置：

| 变量 | 值 |
| --- | --- |
| `DIFY_API_URL` | `https://api.dify.ai/v1` |
| `DIFY_API_KEY` | Dify Workflow Service API Key |

两个变量都选择 Production；需要预览部署时也可同时选择 Preview。保存后重新部署。无需配置 App ID、应用类型或任何公开环境变量。

部署完成后打开 Vercel 域名验证 Workflow 回答。Dify 应用需要处于已发布状态，模型额度和 Workflow 分流由 Dify 账户管理；较长回答也受 [Vercel Function 时长设置](https://vercel.com/docs/functions/configuring-functions/duration)影响。
