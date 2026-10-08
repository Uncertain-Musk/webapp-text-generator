# MVP 0.2 上下文传递与验证（历史快照）

本文保留 2026-10-01 的配置阻塞与代码验证证据，不作为当前运行状态。当前协议以 README.md 为准；2026-10-04 的参数就绪与真实上下文证据见 [MVP 0.3 验收报告](../knowledge-base/reports/mvp-0.3-dify-evaluation.md)。

日期：2026-10-01。状态：本地代码完成，等待 Dify 配置后真实联调；未提交 commit，未部署。MVP 0.1 的未提交改动保留。

## 本轮文件

修改：

- `config/operating-environment.ts`：保存 ID 转平台名称/大写市场代码；未选择或组合无效时输出空字符串。
- `config/tasks.ts`：选中环境时使用简短示例；自然语言平台比较保留比较对象。
- `app/components/index.tsx`：环境传给请求组件，过滤自动提供的两个上下文输入，更新提示和示例。
- `app/components/result/index.tsx`：Workflow 请求增加独立顶层字段；重试取当时的环境；流解析、取消、计时和渲染逻辑不变。
- `app/components/site-shell/index.tsx`：更新选择器说明。
- `app/api/workflows/run/route.ts`：验证并合并 inputs，继续以 streaming=true 调 SDK；上游异常返回脱敏信息。
- `README.md`：当前协议、链路、Dify 配置前提和联调状态。
- `PRODUCT.md`：当前产品能力与阻塞状态。
- `docs/mvp-0.1-validation.md`：标记为历史快照，避免被当作当前接口规范。

新增：

- `utils/workflow-context.ts`：上下文字段类型、保留字段识别和服务端 inputs 合并。
- `tests/workflow-context.test.mjs`：映射、空值、原始 query/额外输入保留、非法值测试。
- `tests/workflow-route.test.mjs`：执行实际 Route Handler，在隔离 SDK 下捕获参数，验证流转发、旧客户端和错误脱敏。
- `docs/mvp-0.2-validation.md`：本记录。

## 保存与传递

前端保存方式不变：localStorage 键 `yuehai.operating-environment.v1`，例如 `{"platform":"tiktok","market":"us"}`，由 `app/components/site-shell/environment.tsx` 管理。

1. `config/operating-environment.ts` 转为 `TikTok Shop`、`US`。
2. `app/components/index.tsx` 通过 `workflowContext` 传给 `app/components/result/index.tsx`。
3. Result 将上下文作为请求体顶层字段，与 `inputs` 并列。
4. 既有 `service/index.ts` / `service/base.ts` 请求本站 `/api/workflows/run`。
5. Route 调用 `utils/workflow-context.ts` 保留其他 inputs，合入上下文，再通过 `app/api/utils/common.ts` 的客户端执行 `client.runWorkflow(inputs, user, true, files)`。

只有服务端 SDK 添加 Dify 密钥。没有 debug 日志，也不输出 SDK 原始异常。没有添加 metadata filter、店铺能力或新模型。

## 输入示例与证据边界

浏览器隔离测试实际捕获的请求（没有请求真实 Dify）：

```json
{
  "inputs": { "query": "Amazon 英国站退款如何处理？" },
  "platform_context": "TikTok Shop",
  "market_context": "US",
  "response_mode": "streaming"
}
```

实际 Route Handler 隔离测试捕获的 Dify SDK 第一个参数：

```json
{
  "query": "退款申请需要多久处理？",
  "extra": "keep",
  "platform_context": "TikTok Shop",
  "market_context": "US"
}
```

`extra` 是测试用于证明其他已有输入未被删除的字段，不是产品新增输入。

旧客户端未提供经营环境时，Route 测试实际捕获：

```json
{
  "query": "平台规则问题",
  "platform_context": "",
  "market_context": ""
}
```

本轮没有向真实 Dify 发起 Workflow 请求，因此没有“真实上游已消费上下文”的证据。

## 检查结果

- TypeScript：`npx tsc --noEmit`，退出码 0。
- lint：`npm run lint`，退出码 0；既有模板警告保留，无新增错误。
- build：`npm run build`，退出码 0。
- 单元/Route 测试：12/12 通过；包括既有 SSE 测试，以及实际 Route Handler 在上游结束前交付测试分块。
- 隔离浏览器测试：即使参数表包含两个上下文变量也只展示 query 输入；示例不重复平台名；问题原文保留；重试读取更新后的上下文；清除后传空字符串；390px 无横向溢出，无 pageerror。
- 隔离测试的参数响应和错误响应只存在于测试进程，不进入产品代码；没有模拟业务答案或结果。
- `git diff --check`：无空白错误。

## Dify 兼容性与待联调事项

通过现有 `/api/parameters` 核查，已发布 Workflow 的 `user_input_form` 只有 `query`（required=true，max_length=256）。未声明 `platform_context` 或 `market_context`。

按用户要求保留新字段，暂停真实上下文联调，不尝试删除字段绕过，也不修改 Dify。用户完成以下配置并发布后，再验证有环境/无环境两条真实 Streaming 请求：

1. 开始节点添加两个可选文本输入 `platform_context`、`market_context`，允许空字符串。
2. 在需要上下文的意图判断/LLM 提示词中引用变量；问题中明确指定的平台/站点优先，空值保持旧逻辑。
3. 保持千问 3.8、知识库和 Streaming，不添加 metadata filtering。

新变量是否被模型实际参考，以及问题内容优先规则是否生效，均需 Dify 配置完成后验证。MVP 0.1 的真实 Streaming 成功记录不能代替本版本的上下文联调。
