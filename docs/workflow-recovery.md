# 长回答断线恢复 MVP

## 请求与状态

正常链路：浏览器 → POST `/api/workflows/run` → `CompletionClient.runWorkflow` → Dify SSE。保留原始 `inputs.query`、经营环境 inputs 合并和 `workflow_finished` 检测。服务端从实际 SSE 事件提取 `workflow_run_id`，以 API Key 作 HMAC 密钥签发绑定运行 ID、Dify user、10 分钟有效期的凭证；凭证不含 API Key。流保持逐行转发，保留心跳；分包 UTF-8、末尾无换行均支持。

运行请求与参数请求均设置同一 `session_id` cookie（Path=/、HttpOnly、SameSite=Lax，production 增加 Secure）；Dify user 始终为 `user_<session_id>`。恢复接口要求 cookie 和签名同时有效，不能凭任意 run ID 查询其他会话。旧 cookie 的值沿用，首次无 cookie 的运行也会建立会话。

提前 EOF、流读取异常或 60 秒无活动时，刷新并保留最后一批可见正文，终止原连接，查询原任务。POST `/api/workflows/recover` 的 JSON 仅为 `{runId, token}`，不携带问题或新检索指令。服务端调用 GET `/workflows/run/{id}?user=<原user>`，最多等待 6 秒；浏览器单次请求上限 8 秒。所有详情响应 `Cache-Control: private, no-store`。

最多查询 12 次，首次立即查询，其后间隔 3 秒，总等待上限 90 秒。running/pending、短暂网络错误或 404 可有限重查；权限错误停止。succeeded 且 outputs.text 含可见正文时才替换为完整答案；failed/stopped/paused/partial-succeeded、空输出、未知状态、缺失 ID 或凭证都不伪装成功。过滤 think 标签，不向浏览器透出原始 inputs、节点过程和供应商错误。页面显示真实终态分类，详细失败原因仍需在 Dify 日志查看。

“停止恢复”终止轮询和本地等待，保留部分正文，不向 Dify 发停止任务命令。取消、新任务和页面卸载均隔离旧请求，迟到结果不能覆盖新回答。手动“重新分析”是新的完整执行；自动恢复绝不调用第二次 run。运行 ID 与凭证只保存在当前请求内存，刷新页面不恢复。

## End 输出与接口证据

2026-10-12 使用现有服务端配置只读查询历史运行 `b908bb31-4fed-4820-9806-d28ffbf2c80b`，HTTP 200、succeeded，outputs.text 是非空字符串。另外以当前已发布工作流执行原长 Query，运行 `ec288724-900b-4738-8c6a-b68cf4cecf5d` 同样确认 outputs 仅有字符串 text。详情 inputs 在当前实例返回 JSON 字符串，解析后已确认 query、Shopee、空站点完全匹配。没有读取或修改 Dify 编辑器。

当前实现仅接受经核验的 `text` 输出变量，避免把元数据或任意字符串当成答案。若后续 Workflow 分支缺少输出，最小人工修改建议为：让相关成功分支的 End 节点输出字符串变量 `text`，指向最终完整回答；人工确认后再发布 Dify。不能用客户端已接收部分文字替代缺失的最终答案。

接口依据为 [Dify 官方 Service API 源码](https://github.com/langgenius/dify/blob/main/api/controllers/service_api/app/workflow.py)。该详情接口按应用查询，不能假设其自动校验终端 user，所以本站另做签名与会话校验。本 MVP 用短请求详情查询满足最终答案恢复，不增加第二条长 SSE 连接；原任务 SSE 重连涉及 Dify 版本、事件回放和断点语义，尚未在当前实例核验，也不能消除 Netlify 长连接问题，暂不纳入。

## 本地验证命令

- `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test tests/*.test.mjs`
- `node node_modules/typescript/bin/tsc --noEmit`
- `npm run lint`
- `npm run build`
- 本地启动网站后，设置 `PLAYWRIGHT_MODULE` 为可用 Playwright 模块路径，运行 `node script/check-workflow-recovery-ui.cjs`。可设 `RECOVERY_TEST_URL`，仅允许 localhost/127.0.0.1。脚本拦截 API 使用测试事件，不连接真实 Dify；包含正常完成、EOF、运行中恢复、失败、空输出、缺失 ID、停止恢复、手动重试及迟到响应隔离。

## Netlify 验收（本次不部署）

1. 人工授权后发布隔离预览，确认对应提交、构建、Runtime/适配器状态。不要开启公开长期调试接口。
2. 新浏览器会话选择 Shopee，输入“不知道应该把广告预算投入哪些商品”（使用普通文字，不含隐藏字符），站点留空；检查 run 的原始 query 和两个经营环境字段。
3. 同一长 Query 连续 5 次：每次只出现一次 run 请求；有正常结束事件则不查询恢复。约 31 秒 EOF 时保留部分正文，recover 只查询同一个 run ID；记录断线时间、轮询次数、最终状态和完整输出比对结果。
4. 对成功恢复逐字比较页面可见正文与 Dify outputs.text 过滤 think 后的正文；必须是替换，不能重复拼接。测试 failed、空 text、running 超时、无 run ID、404 和离线；应保持未完成和可手动重新分析。
5. 恢复中点击停止，确认查询停止且部分正文保留。随后手动重试，旧结果不能覆盖新任务。改变或移除 cookie/凭证、替换 run ID 均须 403，不应发送上游查询。
6. 浏览器只访问本站 API，客户端 JS、网络响应和日志不含 API Key；详情接口不可被缓存。完成后再决定是否正式发布。

## 限制

本功能解决最终答案获取，不证明约 31 秒断流根因已修复。依赖原任务继续执行并保存可读 outputs.text；若平台或 Dify 同时中止任务，无法恢复。超过轮询上限保留未完成状态。10 分钟后签名失效，密钥轮换会使现有签名失效。不新增第三方依赖或环境变量，不修改 Dify Workflow、模型、知识库。

## 2026-10-12 本地验收结果

- TypeScript、Lint、Build 通过；Lint 保留 8 条已有组件警告，没有新增错误。Build 保留已有 Next ESLint 插件、Tailwind 插件提示。
- 53 项单元/路由测试全部通过（原 43 项及新增 10 项）。
- 浏览器自动化 7 场景全部通过：正常完成（1 run/0 recover）、恢复成功（1/2）、失败（1/1）、空输出（1/1）、无标识（1/0）、停止恢复（1/1）、取消后手动重试与旧响应隔离（2/1）。场景使用受控测试事件，未消耗真实 Dify 执行。
- 一次真实 Dify 长 Query，经本地服务端实际运行，并在 31.018 秒主动断开：最后事件 text_chunk、没有 workflow_finished；保留的流原文 1469 字符（未过滤思考标签），5 次查询为 running × 4 → succeeded，总计 45.314 秒取回 1935 字符可见答案。两种字数口径不同，不相减推断缺失字数。
- 同一真实恢复凭证更换会话返回 403；客户端 `.next/static` 95 个文件扫描未发现 API Key。
- Netlify Preview/生产恢复尚未测试，本次未 commit、未 push、未部署。

真实测试的非敏感元数据见 [workflow-recovery-local-evidence.json](workflow-recovery-local-evidence.json)。

## 改动文件

| 文件 | 职责 |
| --- | --- |
| app/api/utils/common.ts | 同一会话 cookie 持久化与作用域 |
| app/api/utils/workflow-recovery.ts | 运行凭证签发、校验及 SSE 增补 |
| app/api/workflows/run/route.ts | 保留 SDK 调用与 inputs，附加恢复凭证和会话 cookie |
| app/api/workflows/recover/route.ts | 校验会话后只读查询原任务，返回最小结果 |
| service/base.ts | 从 SSE 分发运行标识，断流提示交给恢复状态处理 |
| service/index.ts | 转发运行标识回调 |
| service/workflow-recovery.ts | 有限轮询、取消和未完成状态说明 |
| app/components/result/index.tsx | 保留正文、恢复进度、替换完整答案、停止与旧请求隔离 |
| tests/workflow-route.test.mjs | 适配实际运行 Route 的依赖桩，保留上下文回归 |
| tests/workflow-recovery.test.mjs | 轮询与凭证、分包 SSE 测试 |
| tests/workflow-recovery-route.test.mjs | 实际恢复 Route 的权限、输出、失败与脱敏测试 |
| script/check-workflow-recovery-ui.cjs | 本地浏览器 7 场景自动验收 |
| README.md、PRODUCT.md、docs/streaming-diagnostics.md | 同步当前行为与完成规则 |
| docs/workflow-recovery.md、docs/workflow-recovery-local-evidence.json | 设计、结果、限制和部署后验收步骤 |
