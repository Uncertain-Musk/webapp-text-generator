# Streaming 排查与部署核验

## 运行与完成规则

浏览器通过本站 `/api/workflows/run` 获取 SSE，Route Handler 使用服务端 `dify-client` 调用 Dify。正常流仍要求 `workflow_finished` 且 `data.status=succeeded`。提前 EOF 保留已生成正文，并使用流中捕获的运行 ID 和签名凭证向 `/api/workflows/recover` 查询原任务；只有详情状态 `succeeded` 且 End 输出 `text` 有可见内容时，才用完整答案替换部分正文并确认恢复。无 ID、失败、空输出、超出查询上限或用户停止恢复时，显示“回答未完成”。不能把 EOF、HTTP 200 或已有文字等同于完成。恢复实现、限制与验收见 [长回答断线恢复](workflow-recovery.md)。

客户端连续 60 秒无 SSE 活动会取消原流并尝试查询原任务；这是无活动超时。Route 中的 `maxDuration=300` 不能证明 Netlify 为该函数提供 300 秒。现代 Netlify Streaming Functions 的文档上限为 60 秒，实际部署还需核对函数类型、适配器和项目配置。来源：[Netlify Streaming API](https://docs.netlify.com/build/functions/api/)、[Next.js 部署支持](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/)。

## 三路诊断

使用 Node.js 24，在仓库目录运行本地服务后，执行：

```powershell
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON script/diagnose-streaming.mjs --query '不知道应该把广告预算投入哪些商品' --platform Shopee --output-dir '<新的证据目录>' --target all
```

站点未提供时保持空字符串；指定站点使用 `--market SG` 等明确输入。可用 `--target direct|local|netlify` 单独复测，`--local-url` 可指定本地地址。生产地址固定为 `https://yuehaiai.netlify.app`。脚本内部读取 `.env.local`，不打印密钥；只保存事件名称和相对时间、完成状态、Workflow run ID、允许列表内的响应头及过滤思考标签后的回答，不保存节点原始输入或 SDK 异常。输出包含问题与答案，分享前检查业务内容。已有同名结果不会覆盖。

仅测试隔离版本时使用 `--target preview --preview-url https://deploy-preview-<PR编号>--yuehaiai.netlify.app/`。脚本验证域名并拒绝把正式域名用作 Preview；此模式只请求 Preview 的代理，不请求正式站点或 Dify 直连接口。

脚本依次请求 Dify API、本地服务端代理和 Netlify。每次为独立 Workflow 运行，生成长度可能不同；输入保持一致，不代表执行轨迹或输出逐字相同。诊断预算为响应头 30 秒、总计 180 秒；收到响应头后清除头部计时器。这些预算仅限制诊断脚本，不修改服务端、Netlify 或 Dify 超时。

## 2026-10-09 生产复现

输入：query=`不知道应该把广告预算投入哪些商品`，platform_context=`Shopee`，market_context=`""`。测试时间为北京时间 10:20–10:29。

| 通道 | 总时长 | 最后 SSE 事件 | 完成情况 |
| --- | ---: | --- | --- |
| Dify API | 37.926 秒 | workflow_finished | succeeded |
| 本地代理 | 38.305 秒 | workflow_finished | succeeded |
| Netlify 首轮 | 31.070 秒 | text_chunk | 正常 EOF，缺少结束事件 |
| Netlify 复测 | 31.286 秒 | text_chunk | 正常 EOF，缺少结束事件 |
| Netlify 关联运行 | 31.260 秒 | text_chunk | 正常 EOF，缺少结束事件 |

生产请求 ID：

- 首轮 `01M4F7FQTGJD1JY5CXZ012DGNN`，UTC 02:22:15.029 开始。
- 复测 `01M4F7NQWHPSQFEG57JFVT9023`，UTC 02:25:31.640 开始。
- 关联运行 `01M4F7SHRWB95BWYWBA1D8RMBW`，UTC 02:27:36.336 开始。

第三次生产请求的 Workflow run ID 为 `b908bb31-4fed-4820-9806-d28ffbf2c80b`。使用本地 Service API 配置只读查询该运行得到 HTTP 200、`status=succeeded`、Dify `elapsed_time=28.969582`，输入仍为上述 query / Shopee / 空站点；完整输出 1094 字符，而生产流收到的可见正文为 1013 字符，逐字匹配完整输出的前缀，缺失最后 81 字符。该运行已在 Dify 成功，完整文本和结束事件未送达生产客户端。Dify 执行耗时与客户端总时长的起算点不同。

这些证据定位到生产响应链路提前结束，不能确定是具体适配器故障、实际函数时限、运行时退出或上游连接转发问题。三次客户端总时长都约 31 秒，没有接近 60 秒；不能认定命中了文档中的 60 秒执行上限，也不能据此排除实际部署存在其他时限。浏览器无活动超时不是本次脚本断流原因：断开前持续收到文本，最后事件距 EOF 仅约 75–119 毫秒，诊断脚本总预算未触发。

## 部署与日志证据缺口

核验时本地 HEAD 与 GitHub main 均为 `ccd6ae971fbec293ead070f4768d5ce8a9823cae`，本地 Next.js 为 `15.5.25`。当前生产公开响应和资源名称不能证明部署来自此 Commit。HTTP Date 是响应时间，不能作为构建时间。

Netlify 后台访问超时，本环境没有可用 Netlify CLI 授权或项目绑定配置。同项目另一段已检查的对话只记录源码推送，没有提供生产 Deploy / Function 日志证据。尚缺：

1. 当前 Published deploy 的 Deploy ID、完整 Commit SHA、分支、构建开始/结束时间及构建日志。
2. 构建日志中的 Next.js、Node.js、Next.js Runtime / `@netlify/plugin-nextjs` / OpenNext 版本；UI 构建设置、base / publish 目录、适配器是否自动安装或锁定、实际函数类型和有效执行时限。
3. 上述三个请求的函数日志：函数名称、调用开始/结束、平台 Request ID、Duration、异常堆栈、timeout / abort / connection closed 等记录；同时检查对应 Edge Function 日志和路由配置（若使用）。

最小访问范围为能够查看该项目 Deploys、构建配置及 Functions / Edge Functions 日志的现有 Netlify 登录会话。也可由项目管理员导出以上内容，无需把密钥粘贴到对话。

日志入口：Netlify 项目 → **Cloud compute → Functions** → 当前 Published deploy 的服务端函数；时间选择 **Custom**，查询北京时间 2026-10-09 10:22–10:29（UTC 02:22–02:29），使用请求 ID 筛选。函数内部调用 ID 可能不同，需结合时间和请求路径关联。[官方日志说明](https://docs.netlify.com/build/functions/logs/)。构建信息在项目 **Deploys → 当前 Published deploy → deploy log** 核验。

## 最小修复与复验边界

已实施的本地修复只针对可证实的客户端处理缺陷：提前 EOF 未报错、失败分支隐藏部分回答，以及失败结算清理刷新计时器导致末尾文本丢失。新增 SSE 消费测试并用浏览器合成流验证提前 EOF、Workflow failed、重试成功及思考标签不外泄。

生产连接修复等待部署和函数日志后确定。先确认部署是否对应本地基线，再根据已部署适配器的对应版本源码与日志定位转发/退出原因。只调整被证据确认的问题；不靠扩大超时、吞掉异常、把 EOF 当成功或自动拉取完整答案掩盖断流。不修改 Dify、知识库或 Prompt，不自动提交、推送或部署。完成本地检查不能宣布生产已修复。

## 受控 SSE 隔离实验

实验用于区分函数生命周期结束、客户端路径断开以及 Dify / SDK 转发问题。新增 `/api/diagnostics/stream` 使用 Node.js Route Handler，不依赖 Dify。`diagnostic_tick` 序号 0 在请求开始时输出，序号 1–8 每 5 秒输出，45 秒时输出序号 9 的 `diagnostic_complete` 并关闭流。它不发送 `workflow_finished`。

所有事件包含唯一 `probe_id`、序号和服务端相对时间；响应头包含 `X-Stream-Probe-Id`。服务端日志记录 start、每次发送、complete、request_aborted 或 reader_cancelled，包含实际运行的 Node.js 版本，不记录 Authorization、令牌、用户 Query 或任何 Dify 数据。日志中的 sent_complete 只证明服务端将事件加入流，不能单独证明客户端收到。

### 启用范围

必须先获得用户对隔离 Preview 部署的明确授权并具备对应项目权限。Published deploy 的 Commit、适配器版本与函数映射仍须读取真实构建及函数日志；本地构建结果不能替代。

在 **Deploy Preview 环境的 Functions 范围**（或计划仅支持全部范围时的 Deploy Preview 环境）设置以下服务端变量。不要加公开前缀，不把令牌写入仓库或客户端构建，不在 Production / Branch Deploy 环境设置：

| 变量 | 值 |
| --- | --- |
| STREAM_DIAGNOSTIC_MODE | deploy-preview |
| STREAM_DIAGNOSTIC_PREVIEW_HOST | 当前准确的 deploy-preview-编号--yuehaiai.netlify.app 主机名 |
| STREAM_DIAGNOSTIC_TOKEN | 单次实验生成的随机令牌，至少 32 字节 |
| STREAM_DIAGNOSTIC_UNTIL | ISO UTC 绝对到期时间，实验开始时剩余 45 秒至 1 小时 |

接口同时验证请求 URL 的 HTTPS 主机名与配置相同；正式域名始终返回 404，即使误设变量也不会启用。不满足模式、主机、令牌或有效期时均返回 404。若 Preview 的适配器传入不同的内部 Request URL，应先核对真实 URL 转换和部署日志，不能删除主机校验来绕过限制。

Netlify 文档未保证运行时存在构建变量 `CONTEXT`，因此不依赖它来判断环境；通过只在 Deploy Preview 设置的自定义变量和精确主机名限制访问。`netlify.toml` 中的变量不提供给函数运行时，需要从 UI / CLI / API 的对应环境配置。[官方函数环境变量说明](https://docs.netlify.com/build/functions/environment-variables/)。具体适配器版本从真实构建日志读取。

### 运行与日志对照

客户端临时令牌只通过本地进程环境提供，不进入 URL、命令参数或结果文件。用 Node.js 24 运行：

```powershell
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON script/diagnose-controlled-sse.mjs --url https://deploy-preview-<PR编号>--yuehaiai.netlify.app/ --output '<新证据目录>/controlled-normal.json'
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON script/diagnose-controlled-sse.mjs --url https://deploy-preview-<PR编号>--yuehaiai.netlify.app/ --cancel-after-ms 12000 --output '<新证据目录>/controlled-cancel.json'
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON script/diagnose-controlled-sse.mjs --url https://deploy-preview-<PR编号>--yuehaiai.netlify.app/ --output '<新证据目录>/controlled-retry.json'
```

先创建结果目录。客户端保存响应头时间、每个事件的服务端/客户端相对时间、最后事件、正常完成或主动取消原因、Netlify Request ID 和 probe_id；提前 EOF 或异常不会补造事件。`--local-rehearsal` 只允许 127.0.0.1，结果明确标记本地演练，不当成云端证据。脚本的 70 秒预算只控制采集，不改变平台时限。

按相同 probe_id 和时间核对真实函数日志：

| 观察 | 后续判断 |
| --- | --- |
| 客户端约 31 秒 EOF，服务端有之后 35/40/45 秒发送记录 | 函数继续执行；优先检查客户端路径、中间层及适配器响应流消费 |
| 客户端 EOF，服务端记录 request_aborted / reader_cancelled | 取消已传播到 Route；仍须追踪谁发起取消，不能把该日志当成源头 |
| 服务端约 30 秒停止且平台日志明确 timeout / runtime exit | 有证据支持函数生命周期提前终止；据实际配置定位原因 |
| 受控流完整 45 秒，而真实 Workflow 仍断流 | 优先检查 Dify SDK 的 Node stream 到 Response 的桥接；仍需结合真实请求日志 |
| 只有客户端 EOF，没有完整函数日志 | 无法区分上述原因，继续收集证据 |

不要仅凭没有 complete 日志判断函数已终止，也不要仅凭测试流成功就认定 SDK 是根因。

### 修复候选验收

根因明确后，只在相同隔离 Preview 验证最小修复。按原 Query / Shopee / 空站点运行至少五次：

```powershell
1..5 | ForEach-Object {
  node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON script/diagnose-streaming.mjs --query '不知道应该把广告预算投入哪些商品' --platform Shopee --target preview --preview-url https://deploy-preview-<PR编号>--yuehaiai.netlify.app/ --output-dir "<新证据目录>/workflow-$_"
}
```

逐次检查 `workflow_finished`、`status=succeeded`、正文完整、最后事件与总时长；用各自 workflow_run_id 查询最终输出并比对流式正文，不靠字数相近判断完整。验证正常完成、提前 EOF、用户取消和取消后重试；浏览器请求仅访问本站代理，构建客户端产物不得包含 Service API Key。TypeScript、lint、build 和完整单测通过后才评估发布。

本轮只准备并本地验证了实验工具，尚未取得 Preview 部署授权或后台访问，也未完成云端五次长 Query 验收，不建议发布。实验结束后让令牌到期、移除 Preview 变量，后续正式发布候选必须移除实验 Route 和相关临时脚本。不会自动 commit、推送、修改 Netlify 配置或发布。
