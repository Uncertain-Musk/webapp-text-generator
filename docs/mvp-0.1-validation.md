# MVP 0.1 改造与验证记录（历史快照）

本文保留 MVP 0.1 的历史验证证据，不作为当前执行规则；当前能力与接口以 README.md 为准。

验证日期：2026-10-01。基线：`6abc009339408b1cdb65c08c7648a663a2ab25a1`。本记录描述本地未提交改动，未部署。

## 模块与用户需求

| 模块 | 用户需要解决的问题 | 实现 |
| --- | --- | --- |
| 顶部导航 | 知道产品有哪些入口、当前位于哪里 | 首页、规则与合规、问题处理、经营工具，共享导航和当前页标记 |
| 当前经营环境 | 记住关注的平台和站点 | 六平台联动选择，明确保存/清除，localStorage 恢复与跨标签页同步；仅影响 UI |
| 六个任务入口 | 判断遇到的问题从哪里开始 | 紧凑的三列两行任务网格，390px 手机两列三行，320px 单列 |
| 任务示例 | 将经营问题转化为可提问的文字 | 四个知识类任务聚焦输入框、显示示例；明确点击示例才填入，不自动提交 |
| 直接问答 | 自由描述具体情况并获得知识辅助 | 复用现有输入校验、Workflow Streaming、回答操作与失败重试 |
| 合规与工具说明 | 了解尚未提供的功能和当前可走的路径 | 轻量说明与待开放页面，提供返回知识问答的入口 |
| 能力说明与页脚 | 理解回答依据和经营环境的作用 | 知识库辅助说明、环境尚未接入 AI 的提示、以平台最新官方政策为准 |

## 文件清单

### 修改

| 文件 | 内容 |
| --- | --- |
| `app/components/index.tsx` | 首页任务与问答编排、聚焦、示例及显示提示 |
| `app/components/run-once/index.tsx` | 接收显示用 placeholder，不改变输入或请求格式 |
| `app/components/result/index.tsx` | 只调整空状态文案，Streaming 逻辑不变 |
| `app/layout.tsx` | 共享页面外壳与页面元信息 |
| `app/styles/globals.css` | 导航、紧凑任务网格、选择器、扩展页及响应式布局；清除退役模块样式 |
| `README.md` | 当前能力、路由、模块、环境持久化和验证方法 |

### 新增

| 文件 | 内容 |
| --- | --- |
| `config/operating-environment.ts` | 平台站点配置、存储键、存储值校验、显示名称 |
| `config/tasks.ts` | 任务与提问示例配置 |
| `app/components/site-shell/environment.tsx` | 环境状态、持久化、跨标签同步与存储异常降级 |
| `app/components/site-shell/index.tsx` | 导航、选择器与页脚 |
| `app/components/task-launcher/index.tsx` | 六入口与上架合规说明 |
| `app/components/section-page/index.tsx` | 扩展页说明与可用提问入口 |
| `app/compliance/page.tsx` | 规则与合规路由 |
| `app/issues/page.tsx` | 问题处理路由 |
| `app/tools/page.tsx` | 经营工具路由 |
| `tests/operating-environment.test.mjs` | 合法、损坏、过期及跨平台存储值的测试 |
| `PRODUCT.md` | 用户、产品目标、真实能力和交互约束 |
| `docs/mvp-0.1-validation.md` | 本验证记录 |

### 删除

- `app/components/business-tips/index.tsx`
- `data/business-tips.ts`
- `tests/business-tips.test.mjs`

## 验证结果

| 检查 | 结果 |
| --- | --- |
| `npx tsc --noEmit` | 退出码 0 |
| `npm run lint` | 退出码 0；保留既有模板 Hook/未使用参数警告，无新增 lint 错误 |
| `npm run build` | 退出码 0；三个新增路由均成功生成 |
| `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test tests/*.test.mjs` | 5/5 通过：3 项既有 SSE 测试、2 项经营环境测试 |
| 桌面 1440×1000 | 六入口 3×2、当前页导航、选择器及问答正常 |
| 手机 390×844 | 六入口 2×3，点击区域约 92–95px 高，无横向溢出；选择面板完整显示 |
| 窄屏 320×844 | 首页单列及三个扩展页均无横向溢出 |
| 任务与示例 | 四类任务都聚焦输入框并保留已有草稿，点击示例后准确填入，未产生自动 Workflow 请求 |
| 扩展路由 | 页面导航、当前页标记、环境保留、返回首页指定任务并聚焦均通过 |
| 环境状态 | 保存后刷新恢复、清除后刷新保持、换平台清空站点、阻止不完整保存、Esc 取消并回焦均通过 |
| 存储边界 | 损坏值回退、真实跨标签页同步、禁用存储时保留内存状态并提示均通过 |
| 回答操作 | 真实回答复制、有帮助状态切换通过 |
| 浏览器错误 | 自动交互过程中无 pageerror |
| 机械 UI 检查 | impeccable detect 输出 `[]` |
| 任务选中状态对比度 | 浏览器读取最终计算样式，副文案对比度 5.92:1；修正后生产构建通过，桌面和手机截图已确认 |
| `git diff --check` | 无空白错误 |

### 真实 Dify Streaming

在本地生产服务 `http://127.0.0.1:3000`，使用现有 `.env.local` 配置发起一次真实知识问答，未修改 Workflow 或知识库。

- 提交问题：Amazon FBA 买家退款后卖家需要做什么？请按步骤说明需要核查的信息。
- 首个可见正文：提交后约 10.98 秒；此时页面仍处于生成中。
- 完成：约 37.95 秒；收到 347 个 `text_chunk`，`workflow_finished` 状态为 `succeeded`。
- HTTP 200，`Content-Type` 为 SSE；回答自然撑高，手机长回答无横向溢出。
- 请求体仅含原有 `inputs` 和 `response_mode: streaming`；输入值与提交文字完全一致，没有附加平台、站点或环境上下文。
- 浏览器 fetch/XHR 均访问本站接口，没有 Dify `Authorization` 请求头。

### 安全与范围

`service/`、`app/api/`、`config/server.ts`、`config/index.ts`、`package.json` 和锁文件没有修改。扫描本次构建的 33 个客户端资源及页面文件，未发现实际配置的 Dify Key；`.env.local` 仍被 Git 忽略。没有店铺连接、业务数据或模拟扫描、比较、计算结果。

## 开源参考与取舍

- [Dify 官方模板](https://github.com/langgenius/webapp-text-generator)：沿用现有工程与 Workflow 前端链路。上游文档的公开密钥配置不适用于本项目，继续遵守本地服务端代理方案。
- [shadcn/ui 导航实现](https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/navigation-menu.tsx)：参考导航状态与组件组合思路；该项目使用 MIT 许可证，但引入其整套依赖会增加本次适配成本。
- [Headless UI](https://github.com/tailwindlabs/headlessui)：项目已有的无样式组件依赖，继续复用 Popover 的键盘、焦点与关闭行为；无新增依赖。

## 验证范围

独立审查已读取改动和桌面、手机截图，指出任务选中/悬停状态的副文案对比度不足；已将该状态文案调整为更深的绿色。审查代理随后因额度限制未输出完整结论，最终核验由主执行代理完成。

浏览器测试为桌面 Chromium 和手机尺寸模拟，未验证 iPhone Safari 真机、后台切换、锁屏或公网托管环境。真实问答证明本次本地请求成功 Streaming，不代表所有问题的政策准确性或所有网络环境的稳定性。模型由 Dify 侧管理，本轮未读取或修改其模型配置。

最后一轮桌面、手机截图和对比度检查保存在被 Git 忽略的 `.next/mvp-validation/`。该目录属于本地验证中间文件，重新构建会清除；真实请求的关键结果已记录在本文，前一轮原始截图和日志已被本次构建清理。
