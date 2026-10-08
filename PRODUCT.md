# 越海 AI

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

跨境电商商户：遇到平台规则、违规通知、退款售后、上架合规、平台比较或利润广告问题，需要判断从哪里开始。

## Product Purpose

首页是经营问题解决工作台的入口。明确的任务入口连接现有知识问答，帮助用户描述问题、了解规则与经营信息。

## Capabilities and Constraints

- AI 后端仅为 Dify 知识助手；用户提供的当前模型为千问 3.8，由 Dify 侧管理。
- 没有店铺 API、订单、GMV、库存、结算、广告数据或自动操作店铺能力。
- 经营环境保存在 localStorage，作为独立 platform_context/market_context 字段传入服务端并合入 Workflow inputs；不拼接原始 query。
- 首页六类任务均提供知识问答入口；自动合规检查、专项处理流程和利润广告计算工具待开放。上架任务只咨询规则与人工核对要点，利润广告任务只咨询指标与核算思路。
- 保持现有服务端密钥代理、query 输入、知识库和 Streaming 链路；上下文传递不实现 metadata filtering。
- 不使用模拟经营数据，不生成假扫描、比较或计算结果。
- MVP 0.3 分文件维护 General 500 条 / Policy 124 条；Policy 仅覆盖两个美国站。真实事件显示两类文档在同一 Dify dataset 被检索，不能假定分文件即独立数据集。
- MVP 0.3.1 真实 QA 样本映射已确认正确，完整 54 条为 21 PASS、9 EXPECTED_GAP、10 NEEDS_REVIEW、14 FAIL；当前验收建议 FAIL，政策时限、阈值和例外仍有明确错误。已召回正确知识后的错误与覆盖/召回缺失分别记录，证据见当前验收报告。

## Brand and Interaction

沿用越海简洁、专业的商户工具风格；首页优先回答“今天要解决什么”。任务文案具体，说明简短；桌面与 390×844 手机可用，交互支持键盘操作。

点击任务就地展开 6 个场景问题及建议补充的信息；点击示例才填入问题草稿，用户补充后主动发送。切换或收起分类不覆盖草稿，“直接描述我的情况”聚焦既有输入框。六类共 36 个示例仅是提问方向，不承诺知识库完整覆盖。服务连接失败时保留所选示例，恢复后填入；回答期间可浏览分类，填入和编辑入口暂时禁用。

问题输入与“分析与建议”按同宽单列从上到下排列。PC 使用 34px 主标题、22px 区块标题与 16px 正文，辅助说明降低到 12–13px；回答通过原有 Markdown 标题与加粗要点突出重点。页面保持自然滚动，长表格与代码仅在各自内容区域滚动。

## Current Execution Reference

运行方法、模块职责与验证方式以 README.md 为准。知识维护、导入范围及质量报告以 [知识库 README](knowledge-base/README.md) 为准。

## Backend Readiness

2026-10-08 参数接口接受 query、platform_context、market_context；7 次结构、8 次冒烟及 54 次固定集请求全部完成 Streaming，原 query 和独立上下文回显一致，68 次检索使用代码输出 retrieval_query。General、Amazon US、TikTok Shop US 均检索到修复后的完整 QA；全库启用/索引管理状态无法由当前服务 API 取得。系统链路可用，政策回答可靠性未通过，详见 [MVP 0.3.1 完整验收报告](knowledge-base/reports/mvp-0.3.1-final-evaluation.md)。Dify 配置、Prompt、知识正文与检索参数由人工管理，本轮未修改。
