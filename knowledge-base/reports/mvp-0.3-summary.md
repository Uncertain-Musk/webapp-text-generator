# 越海 AI MVP 0.3｜知识覆盖扩容 V1 交付报告（历史快照）

本文保存 2026-10-03 离线交付阶段的证据，不作为当前 Dify 运行状态。当前维护规则见 [知识库 README](../README.md)，2026-10-04 实际召回与验收结论见 [真实 Dify 评测](mvp-0.3-dify-evaluation.md)。

交付检查日期：2026-10-03。官方正文核验日期：2026-10-02。状态：候选文件已生成，等待人工审核。

## 交付结果

General 500条完整保留；新建Policy 124条，Amazon美国站59条、TikTok Shop美国站65条。Policy共43个官方来源页面，所有条目均有官方来源、页面URL及最后核验日期，未用第三方文章或模型记忆补政策事实。

两个可导入文件严格使用 `一级主题,二级主题,问题,答案,关键行动` 五列、UTF-8-SIG和标准CSV转义，一条知识一行。General没有增加metadata列或改写正文；Policy的平台站点通过一级主题及问题文本承载。

### Policy主题覆盖

| 主题 | Amazon美国站 | TikTok Shop美国站 | 合计 |
| --- | ---: | ---: | ---: |
| 商品发布 | 10 | 4 | 14 |
| 商品合规 | 6 | 16 | 22 |
| 账号与违规 | 4 | 6 | 10 |
| 申诉 | 1 | 6 | 7 |
| 订单履约 | 5 | 9 | 14 |
| 物流 | 7 | 9 | 16 |
| 退款退货 | 8 | 8 | 16 |
| 广告与经营 | 9 | 3 | 12 |
| 费用与结算 | 9 | 4 | 13 |
| 合计 | 59 | 65 | 124 |

Amazon未为凑足60条补同义问题；数量以可核验内容为准。

## 原始500条完整性

| 检查 | 结果 |
| --- | --- |
| 数据行/字段 | 500 / 5，名称与顺序一致 |
| 空字段/完全重复问题/完全重复答案 | 0 / 0 / 0 |
| 一级主题/二级主题组合 | 7 / 48 |
| 编码/错列/单元格物理换行 | UTF-8-SIG / 0 / 0 |
| General与原始文件 | 字节和逐格矩阵均一致 |
| SHA-256 | `534a5c9866ea602e46f99bf843e52768967eafc0f33572e6d7be60e82ea52088` |

原文件保留在 `C:\Users\zg105\Desktop\Codex生成文件\跨境电商高频问答500条.csv`，未移动、覆盖、删除、清洗、改写或重排。全部主题分布见 [General基线报告](general-baseline.md)。结构检查不等于逐条业务事实核验。

## 质量验证

2026-10-03实际执行构建、校验（`--as-of 2026-10-03`）和校验器隔离测试，命令均返回0。

| 检查 | 结果 |
| --- | --- |
| 校验错误 | 0 |
| 条件性措辞提示 | 28：General 15、Policy 13；已逐项列入人工审查 |
| Policy完全重复问题/完全重复答案 | 0 / 0 |
| Policy高度相似问题 | 0对，按当前双阈值检测 |
| 候选答案潜在数字/责任冲突 | 自动检出0对；不代替人工语义核验 |
| 官方研究中待确认的规则/范围差异 | 8组，争议结论未入库 |
| 无来源/非法URL/空字段/错列 | 0 / 0 / 0 / 0 |
| 来源映射 | 43个唯一页面覆盖全部124行 |
| 日期未知 | 7个页面未标明确页面日期；43个未确认整页统一生效日 |
| 校验器测试 | 16项通过，临时副本注入错误，不改交付文件 |

校验脚本只报告风险，不自动修改正文。未知日期在审计字段留空，答案明确说明，不从搜索摘要推测。官方已明确的特定规则日期不扩大为整页生效日期。

[自动质量报告](validation-report.md) / [机器可读报告](validation-report.json) / [人工审查记录](manual-review.md)

## 冲突、缺口及人工确认

8组待确认事项包括Amazon专业医疗器械准入范围、广告背景对比要求，以及TikTok退货运费责任、售后响应分支、质量问题响应时限、Final Sale时限、发货扫描认定和退款举证流程。另有1项搜索日期与正文日期差异，仅使用正文日期，不计为业务规则冲突。

25项Gap全部保留未关闭。无法验证的重点包括Amazon账号申诉/A-to-z/SAFE-T详细时限与条件、退货扣费和节日例外、当前FBA条码资格；TikTok结算档位图片、当前完整费率、Shop Ads费用与归因规则。未读到官方正文的具体数字没有写入Policy。

Amazon英国站为用户给定的真实Bad Case，本轮不扩展该站。ACOS、ROAS在General全文未明确出现，按实际覆盖列为Expected Gap。其他范围外、模糊或店铺实时金额问题属于设计的测试场景，不标成线上失败日志。

需人工确认上述规则优先级和具体流程，并对候选中的时限、费率、阈值及例外做导入前抽查。详细问题、页面链接和处理记录见 [人工审查记录](manual-review.md)。

## 测试集

| 预期类型 | Query数 |
| --- | ---: |
| General KB | 10 |
| Policy KB | 29 |
| Expected Gap | 15 |
| 合计 | 54 |

覆盖两个美国站、退款、违规、申诉、Listing、物流、费用，以及短句、口语、模糊和平台冲突Query。所有状态为 `not_run`；这里没有真实Dify召回成绩，也不能据此声称线上问题已经解决。测试中的显式平台优先只是预期，不修改现有Context Resolution。

## 本轮创建及修改文件

| 文件 | 职责 |
| --- | --- |
| `knowledge-base/general/yuehai_general_kb_v2.csv` | 500条General工作副本，可作为独立General导入文件 |
| `knowledge-base/policy/yuehai_policy_kb_v1.csv` | 124条新Policy QA，人工审核后导入 |
| `knowledge-base/policy/yuehai_policy_kb_v1_sources.csv` | 43个官方来源及受影响QA行映射；禁止导入 |
| `knowledge-base/evaluation/yuehai_knowledge_gaps.csv` | 25项缺口和待确认项；禁止导入 |
| `knowledge-base/evaluation/yuehai_policy_kb_v1_test_queries.csv` | 54条待执行测试；禁止导入 |
| `knowledge-base/README.md`、`CHANGELOG.md`、`original/README.md` | 双库职责、维护/导入流程、版本和原始路径 |
| `knowledge-base/reports/general-baseline.md` | 原始CSV质量和完整主题分布 |
| `knowledge-base/reports/validation-report.json`、`.md` | 自动质量报告 |
| `knowledge-base/reports/manual-review.md` | 官方差异、排除草稿、条件性措辞及人工待确认项 |
| `knowledge-base/reports/preservation-report.json` | 原始哈希、155个业务文件及Git HEAD保护检查 |
| `knowledge-base/reports/mvp-0.3-summary.md` | 本交付报告 |
| `knowledge-base/research/amazon.json`、`tiktok.json` | 官方核验记录与候选QA，管理中间文件 |
| `knowledge-base/research/general-audit.json` | General只读结构审计 |
| `knowledge-base/research/evaluation-plan.json` | 测试和范围外缺口设计 |
| `knowledge-base/research/policy-row-map.json` | 候选行号与研究来源映射 |
| `knowledge-base/research/excluded-policy-candidates.json` | 5条排除草稿及原因；禁止导入 |
| `knowledge-base/research/business-baseline.json` | 本轮开始时业务文件哈希快照 |
| `script/build-knowledge-base.py` | 标准库构建5个CSV及行映射，不修改原始文件/Dify |
| `script/validate-knowledge-base.py` | 只读结构、来源、日期、重复和冲突风险检查 |
| `script/test-knowledge-base-validation.py` | 16项校验能力测试 |
| 根目录 `README.md`、`PRODUCT.md` | 同步候选知识库与线上能力边界 |

可导入文件只有General和Policy两个QA CSV。来源、Gap、测试、JSON、报告和文档全部禁止作为Dify主知识库导入。

## 业务与安全边界

保护检查确认 `app/`、`config/`、`service/`、`utils/` 共155个文件与本轮开始时哈希一致，没有新增、删除或修改。Git HEAD仍为 `6abc009339408b1cdb65c08c7648a663a2ab25a1`；前序MVP 0.1/0.2未提交改动完整保留。

本轮未操作Dify、未修改Workflow/Prompt/检索/context、未切换模型、未增加metadata filtering或店铺API、未修改Streaming及密钥代理。未提交Git commit或部署。没有再次运行TypeScript/lint/前端build及真实Streaming联调；本轮验证对象是知识CSV和本地校验器，业务代码未改。

## 推荐人工导入顺序

1. 先审阅自动报告、人工待确认项及高风险官方原页，确认124条候选是否可用；争议Gap保持排除。
2. 保留现有General KB。若内容已是同一500条基线，避免重复导入；General工作副本用于核对和备份。
3. 创建独立的“越海｜平台政策知识库 V1”候选库，只上传Policy QA CSV，沿用现有可靠的CSV/QA分块方式。检查导入预览及实际分块数量，不假设必然124个块。
4. 将候选库接入测试检索属于后续人工步骤。运行54条Query，记录命中库、段落、来源、跨平台误召回和Fallback；全部通过审核后再决定发布。
5. 后续补充Gap时重新核验来源、更新行映射与测试预期、记录版本日志，并再次运行脚本。

本次停在人工审核阶段，不自动导入Dify。
