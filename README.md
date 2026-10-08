# 越海 AI · 跨境电商知识助手

基于 [Dify 官方 Text Generator Web App 模板](https://github.com/langgenius/webapp-text-generator)制作的面试 Demo。首页以商户经营任务为入口，帮助用户找到平台规则、违规处理、退款售后等问题的提问方向，保留现有 Dify Workflow 流式回答与 Markdown 展示。

项目接手入口：[2026-10-08 交接文档](docs/handoff-2026-10-08.md)，包含当前功能、工程验证、知识质量限制和后续修改优先级。

## 当前能力与范围

AI 后端为 Dify 知识助手；当前模型由 Dify 配置，项目需求记录为千问 3.8，前端不选择或切换模型。项目没有真实店铺 API、订单、GMV、库存、结算或广告数据，也没有自动操作店铺或复杂 Agent 能力。

| 入口 | 当前行为 |
| --- | --- |
| 首页 `/` | 六个任务入口，桌面三列两行，手机两列三行，极窄屏单列 |
| 六个首页任务 | 就地展开各自的 6 个场景问题和建议补充的信息；点击具体问题才填入输入框，不自动提交。切换或收起分类不覆盖草稿；“直接描述我的情况”聚焦输入框 |
| 上架合规 | 提供品牌、图片、类目、认证、宣传用语和知识产权规则的提问方向；自动合规检查待开放 |
| 利润广告 | 提供 ACOS、ROAS、成本和利润口径的提问方向；不接入广告数据、不提供计算器结果 |
| 经营工具 `/tools` | 计算工具待开放说明，可返回知识问答了解指标概念 |
| 规则与合规 `/compliance` | 合规检查待开放说明，以及返回首页咨询规则或平台差异的入口 |
| 问题处理 `/issues` | 专项流程待开放说明，以及违规、售后问题的提问入口 |

首页不展示静态轮换经营建议。回答复制、当前页面赞/踩、失败重试及移动端提交定位保持可用。

任务展开区使用场景标题和完整示例问题，桌面两列、手机单列。六类共 36 个示例只作为提问起点，不代表知识库完整覆盖。规则、违规、售后及上架任务在已选经营环境时使用不重复平台名称的示例；平台比较始终明确比较对象。点击示例后显示填入提示，手动编辑或清空问题时提示消失。服务连接失败时仍可浏览分类和选择问题，选中的问题在连接恢复后填入；页面刷新不保留问题草稿。回答过程中允许浏览分类，示例填入和直接编辑入口暂时禁用。

首页问答采用同宽单列：用户输入问题后，在输入区域下方阅读“分析与建议”。PC 内容区最大宽度为 1040px，回答正文可用宽度约 918px；主标题 34px、问答区块标题 22px、任务名称 16px、输入与回答正文 16px、辅助说明 12–13px。回答按 Markdown 标题、列表和加粗内容呈现层级，不改写模型输出。手机保留两列任务入口，问答继续纵向排列，长表格在回答内部横向滚动。

## 知识库维护与真实回归（MVP 0.3）

`knowledge-base/` 分文件维护 General 与 Policy。General 为原始 500 条的字节一致副本；Policy v0.1 为 Amazon 美国站和 TikTok Shop 美国站的 124 条官方来源 QA。两个导入文件均为五列 UTF-8-SIG CSV，来源审计、Gap、测试集及报告不导入 Dify。

MVP 0.3.1 已完成 2026-10-08 的真实结构核验及完整回归。General 4 条、Amazon US 3 条、TikTok Shop US 3 条结构样本均为 Question=CSV 问题、Answer=完整答案；全轮 126 次命中对应 81 条唯一知识，未发现错位。管理 API 未开放，全部文档的启用/索引状态仍须人工确认，不能把样本核验等同于全库扫描。

当前验收建议为 FAIL：8 条冒烟为 4 PASS、1 EXPECTED_GAP、3 FAIL；54 条为 21 PASS、9 EXPECTED_GAP、10 NEEDS_REVIEW、14 FAIL。结构和 Streaming 正常，但仍有政策时限混淆、阈值错误、关键例外遗漏及知识缺口下无依据回答。证据见 [完整验收报告](knowledge-base/reports/mvp-0.3.1-final-evaluation.md)与[前后比较](knowledge-base/reports/mvp-0.3.1-final-comparison.md)，运行方式见 [知识库 README](knowledge-base/README.md)。历史评测及 2026-10-04 阻塞报告完整保留；旧版 28/9/9/8 不作为修复后质量结论。

## 当前经营环境与 Workflow 上下文

顶部选择器支持 Amazon、TikTok Shop、Temu、Shopee、eBay、AliExpress；切换平台后需重新选择站点并保存。平台与站点配置位于 `config/operating-environment.ts`，仅提供常见市场选项，不表示店铺已连接或知识库覆盖所有站点。

选择保存在浏览器 localStorage 的 `yuehai.operating-environment.v1`，支持刷新恢复、跨页面保留、跨标签页同步和清除。损坏或不再匹配配置的存储值会回到未选择状态；存储不可用时只在本次页面保留，并显示简短说明。

经营环境在提交时转换为平台名称和大写市场代码，例如 `tiktok/us` 转为 `TikTok Shop/US`。浏览器向本站 `/api/workflows/run` 发送独立顶层字段 `platform_context`、`market_context`；原始问题仍位于 `inputs.query`。服务端保留已有 inputs，将两项上下文合入 Dify Workflow inputs。未选择时发送两个空字符串，旧客户端省略字段时服务端也补为空字符串。

链路：`site-shell/environment.tsx` → `components/index.tsx` → `components/result/index.tsx` → `service/index.ts` → `service/base.ts` → `app/api/workflows/run/route.ts` → `utils/workflow-context.ts` → `client.runWorkflow`。存储键和已有保存数据保持兼容。每次提交（包括重试）读取当时的经营环境；修改环境不会改写正在执行的请求或已有 query。

已选择环境时，规则、违规、售后和上架任务使用不重复平台名称的示例；平台比较保留明确的比较对象，仍是自然语言提问。示例只在点击时复制到草稿，之后切换环境不会改写草稿。Dify 的 Context Resolution 优先解析问题中明确指定的平台/站点，生成检索用 `retrieval_query`；前端不拼接或改写提交的原始问题。

### Dify 配置前提与联调状态

已发布 Workflow 的开始节点接受 `query` 及两个可选文本变量 `platform_context`、`market_context`，允许空字符串。代码节点解析上下文并生成 `retrieval_query`，知识检索使用该输出；问题中明确指定的平台或站点优先。空环境不应被当作已知平台。

2026-10-08 参数检查 HTTP 200，三个变量均已声明；69 次真实请求均回显原 query 与独立上下文并完成 Streaming，68 次知识检索均使用代码输出 `retrieval_query`，问候分支不检索。显式平台/站点覆盖默认环境正常；无环境问题仍有回答自行假定 Amazon US 的生成问题，Context 节点本身保留空值。发布版 Workflow、模型和知识库由人工管理，不由本地文件自动更新；上下文解析不表示按平台/市场过滤检索候选。

服务端拒绝非字符串上下文；不会记录 SDK 原始异常、密钥或 Authorization。上游失败时返回脱敏错误，不删除新字段或自动降级重试。

## 前端模块

- `app/components/site-shell/`：共享导航、页脚、经营环境选择与持久化。
- `config/tasks.ts`：六类任务、36 个示例问题、环境中性版本、补充信息及能力边界文案。
- `app/components/task-launcher/`：六个首页入口、分类展开与收起、场景问题选择和提问指引。
- `app/components/index.tsx`：任务到问答的衔接、参数读取、输入与回答区域组织。
- `app/components/run-once/`：输入、校验、发送及显示用 placeholder。
- `app/components/result/`：既有 Streaming、超时、取消、回答操作与重试。
- `app/components/section-page/`：扩展页面的待开放状态与真实可用提问入口。
- `app/compliance/`、`app/issues/`、`app/tools/`：后续功能扩展的路由边界。

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

## 流式回答

Workflow Route 使用 SSE 转发 Dify 的 `text_chunk`、节点状态和完成事件。浏览器在首个文本块到达后开始展示回答，后续文本按短时间窗口合并刷新；每次 SSE 活动都会重置无活动超时。连续 60 秒未收到任何活动时，客户端取消请求并显示重新分析入口。

## 验证

```bash
npx tsc --noEmit
npm run lint
npm run build
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test tests/*.test.mjs
```

单元测试直接导入 TypeScript，使用 Node.js 24.19.0 复现；项目没有 `npm test` 脚本。测试覆盖 SSE 分块与思考标签过滤、流读取错误传播，以及经营环境存储值校验、上下文映射、原始 query/额外 inputs 保留、空上下文兼容和 Route Handler 转发/脱敏。浏览器需额外检查：六类任务展开与收起、每类 6 个示例、只在点击示例时替换草稿、直接描述聚焦及连接恢复后的填入、选择器键盘操作和刷新恢复、三个扩展路由、390×844 手机布局、真实回答在完成前显示，以及请求只访问本站代理、携带独立上下文且不包含服务端密钥。

真实 Dify 评测独立于隔离单元测试，当前脚本为 `script/evaluate-dify-mvp-0.3.1.mjs`，按结构、冒烟、完整集顺序执行，运行方式见知识库 README。旧脚本与结果保留。build 与独立 TypeScript 检查应顺序执行，避免构建重建 `.next/types` 时互相干扰。

## 部署到 Vercel

将仓库推送到 GitHub，在 [Vercel 新建项目](https://vercel.com/new)中导入仓库。Framework Preset 选择 Next.js，使用默认安装和 `npm run build` 命令。

在 Vercel 项目的 **Settings → Environment Variables** 中只配置：

| 变量 | 值 |
| --- | --- |
| `DIFY_API_URL` | `https://api.dify.ai/v1` |
| `DIFY_API_KEY` | Dify Workflow Service API Key |

两个变量都选择 Production；需要预览部署时也可同时选择 Preview。保存后重新部署。无需配置 App ID、应用类型或任何公开环境变量。

部署完成后打开 Vercel 域名验证 Workflow 回答。Dify 应用需要处于已发布状态，模型额度和 Workflow 分流由 Dify 账户管理；较长回答也受 [Vercel Function 时长设置](https://vercel.com/docs/functions/configuring-functions/duration)影响。
