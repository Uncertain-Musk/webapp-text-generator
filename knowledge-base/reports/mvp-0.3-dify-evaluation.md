# 越海 AI MVP 0.3｜真实 Dify 回归验收

测试日期：2026-10-04（Asia/Shanghai）；run_id：3f230e50-d867-41b5-a0bb-c441009b6d2c。

真实连接：参数接口HTTP 200；变量检查通过。请求地址：http://127.0.0.1:3000/api/workflows/run，使用现有服务端代理与Workflow。

模型：千问 3.8（用户提供）；事件可观察模型：qwen3.8-max / qwen3.8-flash。不根据回答猜测模型。

## 冒烟测试

| ID | 结果 | 分层 | Streaming | 说明 |
| --- | --- | --- | --- | --- |
| A01 | FAIL_COVERAGE | COVERAGE | true | 检索结果为空，实际进入LLM闲聊(qwen3.8-max)给出ACOS定义；没有General KB证据。概念表述本身不判为政策幻觉。 |
| A02 | PASS | NONE | true | General市场筛选分块被召回，最终回答保留需求、竞争、准入、物流、税费维度。 |
| A03 | FAIL_GENERATION | GENERATION | true | 上下文正确，但把处理期H及H+1/H+4/H+5发货SLA当成退款处理时长；召回缺少明确退款响应规则且未先澄清。 |
| A04 | PASS | NONE | true | 命中TikTok违规申诉P0072及纠正P0073，保留两次、30/15天与即时事项12–72小时例外。 |
| A05 | PASS | NONE | true | 按Amazon美国站Policy说明手动审核、原因费用责任和危险品例外，无跨平台规则。 |
| A06 | FAIL_RETRIEVAL | RETRIEVAL | true | 召回FBA差异调查、FBM退货和补资料；未命中本地已有FBA包装/条码P0037-P0038。最终安全承认不足。 |
| A07 | EXPECTED_GAP | NONE | true | 显式英国站解析为UK；实际召回美国站分块，但最终明确拒绝套用并提示UK知识不足。 |
| A08 | PASS | NONE | true | 代码intent=greeting，未执行knowledge-retrieval或LLM节点，直接问候输出。 |

完成 8/8 条；PASS 4，EXPECTED_GAP 1，FAIL 3。没有系统性冒烟阻塞，按用户策略继续完整测试。

## 完整54条测试

完成 54/54 条。PASS 28；EXPECTED_GAP 9；NEEDS_REVIEW 9；FAIL 8。

| 分组 | 已执行 | PASS | EXPECTED_GAP | NEEDS_REVIEW | FAIL |
| --- | ---: | ---: | ---: | ---: | ---: |
| General KB | 10 | 6 | 0 | 4 | 0 |
| Policy KB | 29 | 22 | 0 | 4 | 3 |
| Amazon US（按实际resolved范围） | 19 | 12 | 2 | 4 | 1 |
| TikTok Shop US（按实际resolved范围） | 18 | 10 | 3 | 1 | 4 |
| Expected Gap | 15 | 0 | 9 | 1 | 5 |

知识类型按测试预期分组，平台按实际resolved字段分组，两者有重叠，不能相加。显式平台覆盖输入环境时以resolved归类；原始输入仍完整保存在CSV/JSON。

Expected Gap正确兜底率：10/15 (66.7%)；完整判EXPECTED_GAP为9/15 (60.0%)。TEST-052核心准入结论保持不确定，但额外术语判断仍NEEDS_REVIEW；TEST-036/037回退失败；TEST-012/013为空检索后直接回答概念，TEST-017未澄清平台直接回答，均未满足各自回退预期。

Policy测试中实际命中至少一个预期行：28/29 (96.6%)。该指标只证明条目进入候选结果，不代表回答正确。没有旧版本真实对照成绩，不能量化覆盖改善幅度。General前10条均召回对应通用条目，6条PASS、4条因额外未受依据支持的细节NEEDS_REVIEW；ACOS/ROAS未有库内覆盖。

最终回答以错误平台为主要依据：0；将US具体规则冒充其他站点：0。完整集中1条范围字段UNKNOWN（TEST-017无上下文且问题歧义），不计作零错误证据。

检索候选中的跨平台混入：2条Query（TEST-015、TEST-027）；跨站点混入：2条Query（TEST-011、TEST-014）。按真实事件resolved范围与已验证的Policy本地行对照，候选污染与最终误用分别统计；本版没有metadata filtering。

明确FAIL的故障层统计（不把NEEDS_REVIEW算作已确认错误）：

- API：0
- ROUTER：0
- CONTEXT：0
- RETRIEVAL：1
- COVERAGE：2
- GENERATION：5

Streaming成功率：完整集54/54 (100.0%)；含冒烟62/62 (100.0%)。

完整54条平均总响应时间：10292 ms；平均首可见文本时间：5627 ms。首文本为过滤隐藏think后第一个非空可见块，均按客户端接收时刻测量。

## 优先关注的前10项非PASS记录

| ID | 结果 | 层 | 优先级 | 问题 | 下一步 |
| --- | --- | --- | --- | --- | --- |
| TEST-041 | FAIL_GENERATION | GENERATION | P1 | AHR 100分回答限制7天、50分14天，与已召回条目100分14天、50分28天矛盾。 | 优先检查多组阈值与处罚天数的成对引用，修复后重测AHR；本轮不改Prompt或知识。 |
| A03 | FAIL_GENERATION | GENERATION | P1 | 上下文正确，但把处理期H及H+1/H+4/H+5发货SLA当成退款处理时长；召回缺少明确退款响应规则且未先澄清。 | 优先检查召回意图匹配及回答对发货/退款时限的区分；相关响应期限为Gap，本轮不改Prompt或知识。 |
| TEST-036 | FAIL_GENERATION | GENERATION | P1 | 先声明知识不足，随后仍给出未发货退款通常24–48小时、自动批准及ODR风险；未正确保持Gap边界。 | 优先约束缺失政策时限的生成与场景混用，核对退款/发货及ODR术语；本轮不改Prompt或知识。 |
| TEST-037 | FAIL_GENERATION | GENERATION | P1 | 损坏退货视频举证范围为待核验Gap；回答从信息不足转为务必上传完整视频，给出无依据的必需操作。 | 后续核对损坏退货举证格式官方正文；回答不得把可尝试建议写成强制要求，本轮不改系统。 |
| TEST-040 | FAIL_GENERATION | GENERATION | P1 | 显式TikTok覆盖Amazon上下文正确；回答一律按二次15天处理，遗漏已召回的即时执法12–72小时例外，并无依据称最终行政救济。 | 优先核对申诉答案对即时执法期限例外的保留，去除无依据救济结论；本轮不改Prompt。 |
| TEST-017 | FAIL_GENERATION | GENERATION | P1 | 无平台站点时未澄清，直接选择Amazon美国站并将结算/到账信息作为退款回答。 | 后续优先让无平台/站点的退款问题澄清范围，并检查退款与结算意图区分。 |
| A06 | FAIL_RETRIEVAL | RETRIEVAL | P1 | 召回FBA差异调查、FBM退货和补资料；未命中本地已有FBA包装/条码P0037-P0038。最终安全承认不足。 | 后续核对FBA query与导入QA字段映射及排序，不在本轮调检索参数。 |
| TEST-021 | FAIL_RETRIEVAL | RETRIEVAL | P1 | 首次扫描退款的标签计划/授权P0003未召回；答案混入收到退货后两天的另一流程。 | 后续核对QA导入映射、query匹配和目标P0003排序；再检查回答是否混用退款阶段。 |
| TEST-012 | FAIL_COVERAGE | COVERAGE | P1 | General无ACOS条目，检索为空后闲聊模型直接解释，未按测试预期承认知识缺口；不判概念本身为错误。 | 后续补General指标知识并区分无命中知识回退与闲聊；本轮不改系统。 |
| TEST-013 | FAIL_COVERAGE | COVERAGE | P1 | General无ROAS条目，检索为空后闲聊模型直接解释，未按测试预期承认缺口；不判公式本身为错误。 | 后续补General指标知识并区分无命中知识回退与闲聊；本轮不改系统。 |

按用户要求，Bad Case文件收录全部非PASS，包含正确EXPECTED_GAP及NEEDS_REVIEW；它们不都代表系统错误。

## 可观察性、判定与限制

actual_kb仅来自真实检索事件dataset_name；未暴露时记UNKNOWN。JSON另存actual_document_types，依据事件document_name区分General/Policy文件，不伪造独立dataset。Top1为第一个实际完成检索节点的返回首项，多节点原始结果分别保留。实际resolved字段及retrieval_query仅取节点输出，不由最终回答推断。

观察到dataset数量：1；跨境电商知识问答 1 (ba919c03-da30-4761-ac8f-abe35dad0c97)。

实际观测为同一dataset中的General原文件与Policy CSV两个文档，未观测到两个独立dataset。仅按真实document_name区分知识类型；不把回答中的平台名当作检索来源。

QA字段映射：162次检索命中、101个唯一分块，实际question匹配本地CSV答案列、answer匹配关键行动列。原商户问题未作为QA question保存；应后续人工核对Dify导入预览。逐条对照保留在JSON。

HTTP成功和Streaming完成不能单独证明语义PASS。自动标注保持NEEDS_REVIEW，逐条证据审查保存在yuehai_mvp_0.3_dify_reviews.json。没有可用的旧版真实评测成绩，不能量化新库相对旧库的提升幅度。

## 上下文、Router与API安全

Dify开始节点逐字段回显原query及两个独立上下文：62/62 (100.0%)。知识检索节点实际输入等于代码输出retrieval_query：61/61 (100.0%)。

显式冲突：TEST-019由TikTok环境改为问题指定的Amazon，TEST-040由Amazon环境改为问题指定的TikTok；A07/TEST-011的UK覆盖US环境。A08执行greeting代码回复且未运行检索或LLM。未选择环境时两个字段保持空字符串；TEST-017的错误假定发生在答案生成，并非Context节点把空值解析为Amazon。

路径：浏览器经营环境 → Result → service → /api/workflows/run → buildWorkflowInputs → Dify SDK。评测复用同一代理、inputs构建函数与SSE读取器；不接触客户端密钥或直连Dify。原始事件JSON为本地诊断材料，包含节点输入和模型输出，应仅用于维护审查。

生产目录与5个原始知识/测试CSV保护：哈希一致（160个文件）。评测脚本不读取API Key，仅向本站代理发送问题和独立上下文字段。

## 阻塞与工程检查

无已确认的系统性冒烟阻塞。

- TypeScript：{"result":"PASS","exit_code":0,"command":"node node_modules/typescript/bin/tsc --noEmit","note":"首次与build并发时.next/types被构建重建导致TS6053；build完成后顺序重跑通过，未改代码。"}
- lint：{"result":"PASS","exit_code":0,"command":"node node_modules/next/dist/bin/next lint","warnings":8,"note":"保留既有Hook/unused参数警告、Next ESLint插件及next lint弃用提示。"}
- build：{"result":"PASS","exit_code":0,"command":"node node_modules/next/dist/bin/next build","note":"Next.js 15.5.25生产构建成功；既有lint及Tailwind line-clamp警告未清理。"}
- unit_tests：{"result":"PASS","exit_code":0,"command":"node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test tests/*.test.mjs","tests":12,"passed":12,"failed":0,"note":"独立单元测试含隔离SDK；与62次真实Dify调用分开统计。"}

结果文件安全扫描：PASS；8个评测文件及29个客户端JS产物未含服务端真实API Key；未打印密钥或Authorization值。

## 验收建议

FAIL

真实连接、上下文、Router与Streaming通过链路验证；Policy有明确召回贡献，未发现最终主依据的系统性跨平台/跨站点污染。但政策可靠性暂不建议验收通过：100分AHR处罚天数错误；已召回的即时申诉期限例外被遗漏；两个设计Gap仍生成无依据时限或强制操作。先处理生成层P1及导入字段映射，再复测关键Bad Case与全部Gap。FAIL指本次政策可靠性验收，不代表API不可用。

本轮只评测与定位。后续修复方向依据故障层和优先级，未修改Prompt、知识正文、检索参数、Context Resolution、UI或生产请求逻辑，未commit或部署。
