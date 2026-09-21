# 越海 · 跨境电商 AI 知识助手

基于 [Dify 官方 Text Generator Web App 模板](https://github.com/langgenius/webapp-text-generator)制作的面试 Demo。保留模板的 Dify API 路由、流式响应和 Workflow 请求逻辑，提供中文提问与 Markdown 回答界面。

## 本地运行

需要 Node.js 20 或更新版本。复制 `.env.example` 为 `.env.local`，填写自己的 Dify 应用配置，然后运行：

```bash
npm ci
npm run dev
```

打开 <http://localhost:3000>。发布前运行 `npm run build`。

## Dify 配置

| 变量 | 用途 |
| --- | --- |
| `NEXT_PUBLIC_APP_ID` | Dify 应用 ID |
| `NEXT_PUBLIC_APP_KEY` | Dify 应用 API Key |
| `NEXT_PUBLIC_API_URL` | Dify API 地址，云端为 `https://api.dify.ai/v1` |
| `NEXT_PUBLIC_APP_TYPE_WORKFLOW` | Workflow 应用填 `true`；文本生成应用填 `false` |

变量名沿用官方模板。密钥只在服务端 API 路由读取，不在客户端界面使用。真实值只填 `.env.local`，该文件已被 Git 忽略；`.env.example` 不含密钥。应用需要在 Dify 中发布。前端从 `/api/parameters` 读取输入参数，再调用原有的 `/api/workflows/run` 或 `/api/completion-messages` 路由。推荐问题会填入 Dify 提供的文本输入字段，不改变请求协议。

可选的 `NEXT_PUBLIC_APP_BASE_URL_PATH` 和 `NEXT_PUBLIC_API_PREFIX` 用于非根路径部署；Vercel 根域名部署时保持为空。

## 部署到 Vercel

将此仓库推送到 GitHub，在 [Vercel 新建项目](https://vercel.com/new)中导入该仓库。项目根目录保持仓库根目录，Framework Preset 选择 Next.js，使用默认的 `npm run build`。在 Vercel 项目的 Environment Variables 中添加上表四个变量，选择 Production 环境并部署。更换环境变量后需要重新部署。

部署完成后打开 Vercel 域名，用真实问题验证 Workflow 回答。Dify 应用的额度、模型服务及 Workflow 发布状态由 Dify 账户管理；较长的回答受 [Vercel Function 时长设置](https://vercel.com/docs/functions/configuring-functions/duration)影响。
