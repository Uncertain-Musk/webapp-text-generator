# 越海知识库：General KB + Policy KB

General 保存跨境电商通用经营概念与方法；Policy 保存 Amazon 美国站、TikTok Shop 美国站的具体平台规则。分文件维护稳定知识和变化较快的政策，避免把通用建议包装成平台规则。

本目录保存知识文件、来源审计与评测证据。当前 MVP 0.3.1 先核验 QA 映射，再依门槛执行原冒烟和固定测试集。本轮只评测，没有导入或修改 Dify、Prompt、知识正文、检索参数、模型或网站。

2026-10-08 结构核验为 VERIFIED：General G0001/G0003/G0009/G0011、Amazon US P0001/P0002/P0037、TikTok Shop US P0062/P0063/P0072 的真实 QA 均对应问题列索引 2、完整答案列索引 3。全部命中 126 次、81 条唯一知识均无错位，Policy 来源/适用范围/核验日期保留。当前服务 API 不能列出全库启用和索引状态，未观察到旧错误分块不等于已证明所有旧文档停用。

本轮 8 条冒烟为 4 PASS、1 EXPECTED_GAP、3 FAIL；54 条为 21 PASS、9 EXPECTED_GAP、10 NEEDS_REVIEW、14 FAIL。验收建议 FAIL，依据见 [完整报告](reports/mvp-0.3.1-final-evaluation.md)和[前后比较](reports/mvp-0.3.1-final-comparison.md)。历史完整集 28/9/9/8 与 2026-10-04 阻塞报告完整保留，不能作为修复后质量结论。

## 导入范围

| 文件 | 用途 | 导入 Dify |
| --- | --- | --- |
| `general/yuehai_general_kb_v2.csv` | 越海｜跨境电商通用经营知识库，原始 500 条的字节一致副本 | 是，已有同一基线时避免重复导入 |
| `policy/yuehai_policy_kb_v1.csv` | 越海｜平台政策知识库 V1，两个美国站 | 是，人工审核后 |
| `policy/yuehai_policy_kb_v1_sources.csv` | 来源、日期及受影响 QA 行映射 | 禁止 |
| `evaluation/yuehai_knowledge_gaps.csv` | 无法覆盖、无法访问或待确认的知识缺口 | 禁止 |
| `evaluation/yuehai_policy_kb_v1_test_queries.csv` | 固定 54 条召回、覆盖及回退测试 | 禁止 |
| `evaluation/*dify*`、`*smoke*`、`*bad_cases*`、`*engineering_checks*`、`evaluation/runs/` | 真实回答、脱敏节点事件、判定与工程证据 | 禁止 |
| `research/`、`reports/`、README、CHANGELOG | 研究中间记录、审计和维护文档 | 禁止 |

两个导入文件都只有五列，顺序为 `一级主题,二级主题,问题,答案,关键行动`，UTF-8-SIG 编码，一条知识一行，采用标准 CSV 转义。管理 CSV 也使用 UTF-8-SIG，但结构独立。

仓库 `.gitattributes` 对 `knowledge-base/**` 禁用 Git 换行转换，以保留导入文件与历史证据的原始字节。评测 CSV 中回答自带的 Markdown 换行空格和空行应原样保留，不作格式清洗。

## 五列规则

- 一级主题：Policy 仅使用 `Amazon｜美国站`、`TikTok Shop｜美国站`。
- 二级主题：商品发布、商品合规、账号与违规、申诉、订单履约、物流、退款退货、广告与经营、费用与结算。
- 问题：真实卖家可能提出的一个主要问题，明确平台和美国站，避免只有标题或多问题合并。
- 答案：写明适用范围、规则及重要例外，包含 `官方来源：`、`官方页面：`、日期说明和 `最后核验：`。页面日期和生效日期分别记录；未知日期留空并说明，不从搜索结果猜测。
- 关键行动：该问题下卖家接下来可以做的动作，不重复整段答案，不新增未经官方支持的期限或材料要求。

P0001 等编号是 Policy CSV 的一基数据行号，G0001 等是 General CSV 的一基数据行号；它们只存在于管理文件，不增加导入列。重排 Policy 时必须重新生成来源映射和测试预期行号。

来源审计中的平台市场使用 `Amazon / US`、`TikTok Shop / US`。测试集的 `platform_context`、`market_context` 表示前端实际值，未选择时为空；问题明确指定其他平台时，预期条目按问题范围指定。答案里的页面标题使用中文译名，来源审计保存原始英文标题。

## 官方来源与新增标准

来源必须实际打开正文核验。Amazon 使用 Sell on Amazon、Seller Central、Amazon 官方政策或 Amazon Ads 官方页面；TikTok 使用美国 Seller University / Seller Center 正文。搜索摘要、第三方文章、登录页面壳、模型记忆不能作为事实来源。

新增知识前先检查 General 是否已有该通用问题，并在 Policy 中检查重复意图。保存来源页面标题、URL、页面日期、生效日期、核验日期及关键证据定位；阅读最新详细政策和适用条件，再写简短中文 QA。不同官方说明出现冲突时，将争议事实移入 Gap，不能自动择一。未访问或未核验的内容不得写入候选 Policy。

未找到明确生效日期时，答案写“官方页面未明确标注生效日期”。`last_verified_date` 表示本次读取日期，不等于政策生效日。最终是否仍然有效，应在导入前再次人工查看高风险原始页面。

## Gap 与版本流程

Gap 必须注明来源：实际访问失败、官方条款差异、当前文件的覆盖缺口、用户提供的 Bad Case 或范围外问题；不要把设计的测试 Query 标成真实线上失败日志。Amazon 英国站为本轮范围外 Gap，不能借此扩展 Policy V1。

审核某条 Gap 后先核验正文和条件，再更新研究记录及对应 QA，运行构建与校验，更新来源行映射、测试集和 CHANGELOG。版本日志记录新增/修改/废弃数量、来源变化、未解决 Gap 和限制；政策停用时保留审计历史并从当前导入文件移除。

## 本地构建、校验与报告

仅使用 Python 标准库，不安装新依赖。在项目根目录执行：

```powershell
python script/build-knowledge-base.py
python script/validate-knowledge-base.py --as-of 2026-10-03 --report-dir knowledge-base/reports
python script/test-knowledge-base-validation.py
```

Windows 控制台若显示乱码，可先设置 `$env:PYTHONIOENCODING='utf-8'`。文件内容仍以 UTF-8-SIG 严格解析。原始文件不在默认路径时，两条命令都可传 `--original '绝对路径'`。

校验默认截止日为本版核验日 `2026-10-02`；后续版本用 `--as-of YYYY-MM-DD` 指定真实核查日期，不能仅修改日期标签而省略联网复核。测试脚本只在临时副本注入错误以检查检测能力，不改动交付 CSV。

构建脚本只生成候选文件，检查原始哈希后复制 General，不修改原始文件。校验脚本检查五列、编码、空值、唯一性、官方 URL、来源映射、日期、模型式语言、HTML 垃圾，并输出近似问题和数字/责任冲突风险。风险提示需要人工判断，脚本不自动清洗正文，也不证明所有语义冲突已消除。

离线质量证据见 [交付汇总](reports/mvp-0.3-summary.md)、[质量报告](reports/validation-report.md)、[基线报告](reports/general-baseline.md)和[人工审查记录](reports/manual-review.md)。它们记录文件生成与核验阶段，不代表当前线上状态。本版官方正文核验于 2026-10-02，文件检查于 2026-10-03；运行回归不会更新来源核验日期，也不证明官方政策至今没有变化。

## 真实 Dify 评测

Node.js 24.19.0，复用现有 PapaParse、服务端代理、`buildWorkflowInputs` 与 `readSSEStream`，无新依赖。人工完成配置并确保正确 QA 可由当前 Workflow 检索后，先启动项目，再在根目录依次执行：

```powershell
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON script/evaluate-dify-mvp-0.3.1.mjs --output-dir knowledge-base/evaluation/runs/2026-10-08-final --report-prefix mvp-0.3.1-final --phase structure
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON script/evaluate-dify-mvp-0.3.1.mjs --output-dir knowledge-base/evaluation/runs/2026-10-08-final --report-prefix mvp-0.3.1-final --phase smoke
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON script/evaluate-dify-mvp-0.3.1.mjs --output-dir knowledge-base/evaluation/runs/2026-10-08-final --report-prefix mvp-0.3.1-final --phase full
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON script/evaluate-dify-mvp-0.3.1.mjs --output-dir knowledge-base/evaluation/runs/2026-10-08-final --report-prefix mvp-0.3.1-final --phase report
```

默认访问 `http://127.0.0.1:3000`，可用 `--base-url` 指定同一网站代理。参数接口必须声明三个输入；结构需核验 General、Amazon、TikTok 各至少 3 个唯一 QA，发现任一错位立即停止。独立目录模式只在 API/Streaming、错位或系统性 Context/Router 等阻塞时停止；单条政策错答、缺口或排序问题记录后继续完整集。脚本不读取密钥，只发送原 query 和独立上下文，保存真实事件并脱敏敏感字段。缺少内部证据的字段用 UNKNOWN，不根据最终回答猜命中库。

上述命令对应已完成轮次，重复执行会跳过已有请求；新一轮必须使用新的 `--output-dir` 和 `--report-prefix`，保留历史结果及报告。默认无目录参数的旧模式仅用于旧轮次兼容，不用于新的完整验收。结果 JSON 支持断点续跑；`--phase report` 不调用 Dify。

历史文件保护清单固定到本轮开始时的哈希基线，续跑期间新增的独立报告不等于修改旧报告。原保护文件的修改/删除及业务目录新增仍会触发阻塞；保护误报的解除必须有原文件未变证据，并在 `protection_notices` 保留原状态与理由。

语义判定默认 NEEDS_REVIEW，完整阅读实际 QA 和回答后，将审查写入该轮目录的 `yuehai_mvp_0.3.1_dify_reviews.json`，以 `run_id` 绑定本轮，必须包含证据。8 条冒烟审查完成后才运行 full；54 条全部审查后用 report 同步统计。FAIL_GENERATION 必须列出实际召回且正确映射的知识行号，未正确召回不能归因于 Prompt；关键期限和适用条件不能只按关键词判定。当前完整报告正文保存在本轮审查 JSON 的 `final_report_markdown`，report 可重现。工程检查需单独执行，证据保存在本轮 engineering JSON 及结果 JSON 的 engineering 字段。

- `evaluation/runs/2026-10-08-final/yuehai_mvp_0.3.1_results.csv`：54 条完整集结果。
- 同目录 `yuehai_mvp_0.3.1_smoke_results.csv`：8 条冒烟结果，单独汇总。
- 同目录 `yuehai_mvp_0.3.1_results.json`：结构、冒烟、完整集的完整回答、QA 对照、脱敏节点事件、时延与保护哈希。
- 同目录 `yuehai_mvp_0.3.1_dify_reviews.json`：62 条证据判定、验收建议及可重现报告。
- 同目录 `yuehai_mvp_0.3.1_bad_cases.csv`：27 条失败或待审核记录；正确 EXPECTED_GAP 不收录。
- 同目录 `yuehai_mvp_0.3.1_engineering_checks.json`：TypeScript、lint、build、12 条单元测试、文件与密钥保护证据。
- `reports/mvp-0.3.1-final-evaluation.md`、`mvp-0.3.1-final-comparison.md`：当前验收与逐条前后比较。

诊断 JSON 包含 Workflow 节点输入和模型输出，作为本地维护证据管理，不上传知识库。正确映射要求 Question 对应 CSV 问题（索引 2）、Answer 对应完整答案（索引 3）。核验按实际文本匹配本地行，仅忽略空白，不依赖旧 segment_position；document ID 未变不能证明错位。当前 General 与 Policy 同属实际 dataset `ba919c03-da30-4761-ac8f-abe35dad0c97`，文档与完整分块证据保存在 QA 对照中。全库文档启用/索引完成情况须人工从管理界面确认。

## 人工导入建议

先审核高风险时限、金额、费用、处罚及例外，确认报告中待审项。保留现有文档与历史评测证据。人工导入或重新导入前明确目标 dataset，检查五列如何被映射到 QA 或正文，确保原问题、完整答案、行动和来源保留，并核对实际分块数。General 与 Policy 分文件维护，不能仅凭文件名称假定它们位于独立 dataset；管理文件不得上传。

导入、检索连接或参数调整均由人工完成，完成后用固定测试集复测并记录实际 dataset、文档、命中段落、回答依据及回退行为，再决定是否发布。文本中的平台/站点有助于现有检索区分范围，不表示已经实现 metadata filtering。
