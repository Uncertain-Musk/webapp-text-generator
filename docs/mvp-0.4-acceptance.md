# 越海 AI MVP 0.4 首轮本地验收报告

本报告记录 2026-10-10 首轮版本；后续漏斗与分层建议的当前验收见 [漏斗升级验收](mvp-0.4-funnel-acceptance.md)。其中桌面/手机截图及 35 项测试不代表后续版本的验证结果。

日期：2026-10-10（Asia/Shanghai）。结论：本地开发与验证完成，等待人工审核；未提交、推送、部署或导入生产知识库。Git HEAD 保持 ccd6ae971fbec293ead070f4768d5ce8a9823cae。

## 交付功能与入口

保留原知识助手及所有导航。“经营工具” /tools 增加入口，分析页路径为 /tools/shopee-ads。运行项目后访问该路径。

页面提供站点、币种、统计日期、归因方式、订单/销售口径与广告数据输入；可选目标 ROAS、贡献毛利率和 Conversions。支持演示数据、清空/重置、实时计算、指标说明、规则诊断、摘要复制及官方来源链接。

纯 TypeScript 计算 CTR、CPC、CPM、ROAS、ACOS、每订单广告成本、订单点击比、CVR、估算保本 ROAS。规则区分缺失与零、Orders 与 Conversions，以及订单大于点击的归因边界。漏斗等宽，明确面积不表示数量。多个诊断按优先级排列，不使用虚构行业阈值。

商家输入仅保留于组件状态，不上传、不持久化；不接入店铺 API，不调用模型计算。新增页面使用既有绿色 UI 与作用域 CSS，没有新增依赖。

## 实际修改文件（本版本）

| 文件 | 内容 |
| --- | --- |
| app/tools/page.tsx | 从占位页改为工具入口 |
| app/components/site-shell/index.tsx | /tools 子页导航激活 |
| app/tools/shopee-ads/page.tsx | 新路由与 metadata |
| app/tools/shopee-ads/analyzer.tsx | 本地表单、漏斗、指标、诊断和复制 |
| app/tools/shopee-ads/styles.module.css | 桌面/移动端样式与提示框 |
| utils/shopee-ads.ts | 校验、公式、规则、格式与摘要 |
| tests/shopee-ads.test.mjs | 13 项指标、边界和规则测试 |
| script/validate-shopee-kb.py | 离线结构、站点、来源、主题检查 |
| script/test-shopee-kb.py | 9 项正例与破坏性负例测试 |
| knowledge-base/shopee/shopee_ads_qa.csv | 20 条广告候选 QA |
| knowledge-base/shopee/shopee_market_insights_qa.csv | 8 条行业候选 QA |
| knowledge-base/shopee/shopee_sources.csv | 28 条题目映射、9 个来源、逐条审核记录 |
| knowledge-base/shopee/shopee_kb_import_guide.md | 导入步骤、资料缺口、5 条人工冒烟 |
| README.md | 当前能力与开发入口 |
| PRODUCT.md | 手工广告分析与演示数据边界 |
| knowledge-base/README.md | 区分 Shopee 两列与原 General/Policy 五列 |
| docs/mvp-0.4.md | 模块职责、公式、规则、测试与回滚 |
| docs/mvp-0.4-acceptance.md | 本报告 |

开始本轮前已有的 Streaming 改动不属于上述清单：result 组件、service/base.ts、service/sse-stream.ts、相关 SSE 测试、诊断 Route/CLI、Streaming 文档与旧交接文档。未覆盖这些工作。General/Policy CSV、package.json、锁文件、Workflow Route、经营环境配置均无本版本改动。

## 知识来源与审核

本批 28 条：20 条官方广告知识（含明确标注的数学推导），8 条行业研究。QA 文件严格只有 question、answer 两列，来源管理独立保存。

| 来源 | 使用范围 | 证据边界 |
| --- | --- | --- |
| [Shopee 中文基础指南](https://ads.shopee.cn/learn/faq/310/58) | 创建、预算、出价、收费 | 不指定具体站点，不推广为所有站点规则 |
| [新加坡指标文档](https://ads.shopee.sg/learn/faq/520/176) | CTR、Orders、Conversions、ROAS、ACOS、归因 | 限新加坡，保留日期和范围 |
| [新加坡搜索广告创建](https://ads.shopee.sg/learn/faq/526/187) | 匹配与选品目标 | 未采用与另一页面冲突的竞价增幅 |
| [新加坡搜索广告优化](https://ads.shopee.sg/learn/faq/526/180) | 商品页、流量与成本排查 | 部分卖家适用；建议不保证效果 |
| [GMV Max](https://ads.shopee.sg/learn/faq/519/1787) | 原理、创建、目标与学习期 | 官方不保证达到目标；未编造学习天数 |
| [Paid Sales](https://ads.shopee.sg/learn/faq/525/2147) | 销售口径与跨期比较 | 付款后取消/退货仍可能计入，非净收入 |
| [Momentum Works 公开新闻稿](https://thelowdown.momentum.asia/wp-content/uploads/2026/04/Embargoed-Press-release-Momentum-Works-Ecommerce-in-SEA-2026.pdf) | 2025 年平台规模、Shopee 定位与竞争 | 2026-04-14 发布；只取得公开摘要，非付费全文 |
| [Google 官方摘要](https://blog.google/company-news/inside-google/around-the-globe/google-asia/sea-economy-2025/) | 2025 数字经济范围与年化/地域限制 | 完整报告下载未成功，未补造全文 |
| [ChannelEngine 2025 PDF](https://www.channelengine.com/hubfs/Marketplace_Seller_Trends_Report_2025.pdf?hsLang=nl) | 欧美样本与手工运营工时 | 20 页全文；不代表 Shopee 东南亚商家，不称为最新报告 |

原始指定链接访问结果及替代来源说明见导入指南。每题均在来源表记录站点、类型、发布日期或未标注说明、核验日、候选审核状态、核对要点与限制。行业相关性不作为商家提问频率证据。

## 验证结果

| 检查 | 实际结果 |
| --- | --- |
| Node 单元/回归测试 | 35/35 通过，其中新增广告测试 13 项，既有测试 22 项 |
| 原知识库验证测试 | 16/16 通过 |
| Shopee CSV 验证测试 | 9/9 通过；实际文件校验 20 + 8 条通过 |
| TypeScript | tsc --noEmit 退出码 0 |
| lint | 退出码 0；原项目 8 条警告，无新增文件错误 |
| build | 退出码 0；15 个页面生成成功，新分析页静态生成 |
| 新页面构建体积 | 路由 7.8 kB，First Load JS 114 kB（本地 build 输出） |
| 密钥检查 | 扫描 94 个客户端静态产物，本地配置的 Dify API Key 未出现；不等于完整安全审计 |
| diff 检查 | git diff --check 通过 |
| 原知识问答真实本地回归 | HTTP 200，12.883 秒，workflow_finished / succeeded，366 个可见字符 |
| 桌面与手机 UI | 1280×900、390×844 视口；无页面横向溢出，示例/异常/归因提示/复制/清空通过 |

真实问答请求：“跨境电商选择目标市场时应该先了解什么？”，独立上下文 Shopee / SG；2026-10-10 11:09:18 UTC 发起。首文本 9.327 秒，最后事件 12.877 秒。该测试证明原本地请求/Streaming 链路可完成，不宣称原知识库整体回答质量通过。

浏览器验证过程中发现手机指标提示越过左边界，修复后 CTR 提示横坐标 34.67–234.67、CPC 提示 140–340，均在 375 CSS px 可用宽度内（390 视口含滚动条）。复制内容带站点、币种、周期、归因、指标和建议，演示数据明确标注。清空后数据为空、复制禁用。输入点击 10001/曝光 10000 显示错误；订单 300/点击 200 的浏览归因显示 150% 与口径提示。

需求测试覆盖：

1. 10000 曝光、200 点击、花费 100、订单 10、销售 500：CTR 2%、CPC 0.5、CPM 10、ROAS 5、ACOS 20%、每订单成本 10、订单点击比 5%；另填 15 转化时 CVR 7.5%。
2. 全零、点击零、花费零、销售零：区分零分子与零分母；不出现 Infinity/NaN。
3. 负数、非数字、无限值、分数计数、点击超曝光：拒绝；极小输入造成比例溢出亦拒绝。
4. 订单超点击：三类归因分别提示，保留可计算比率，不自动视为错误。
5. 有/无目标、20%/50%/100% 毛利率、成本未确认、目标达标但亏损优先级：通过。
6. 不同币种与日期、无效日历日期、规则与输入一致、极小正数显示、演示摘要标识：通过。
7. CSV 编码、列次序、空值、重复、来源映射、同源答案互换、站点混用负例：通过。
8. 原 Workflow 参数、上下文、SSE 中断/完成与真实本地请求：通过本轮链路检查。

## 未验证与已知问题

- 未部署 Netlify 或隔离预览，不能宣称线上 MVP 0.4 已通过。
- Shopee QA 尚未导入 Dify；5 条人工冒烟是待执行清单，未宣称真实召回通过。Dify 控制台版本及 QA 导入界面未核验。
- 现有生产约 31 秒 Streaming EOF 未在本版本修复；MVP 0.3.1 政策知识质量 FAIL 仍然成立。
- lint 的 8 条既有警告、Next lint 弃用提示、Next ESLint 插件与 Tailwind line-clamp 提示保留，未为本版本重构原组件。
- 浏览器验收为桌面 Chromium 引擎与手机尺寸模拟，未做真实 iOS/Android 多浏览器测试。
- 广告诊断是单期汇总规则，不验证原始报表、增量因果或利润；数值采用 JavaScript 浮点，不作为财务结算依据。

## 待人工完成与下一步

工具本身无需 Dify 配置。审核候选后，先在非生产测试库逐份导入两列 CSV：Question=question，Answer=answer；预览与抽查首/中/末行，确认 20 与 8 条，再执行导入指南中的 5 条冒烟和跨站反例。来源表不导入，不沿用旧五列字段位置。

建议先验收本地页面与知识候选；测试库通过后再决定生产导入及发布范围。生产断流问题应作为单独 P0 继续处理。本轮工作至此停止，等待审核。
