# 越海 AI MVP 0.3.1｜映射修复后真实验收

日期：2026-10-04（Asia/Shanghai）；模型事件：qwen3.8-flash。

参数接口HTTP 200，声明检查通过。测试访问http://127.0.0.1:3000/api/workflows/run，使用现有代理、SDK与Streaming读取器。

## 结构核验

状态：BLOCKED。实际Question与CSV问题、Answer与CSV答案逐字去空白对照；仅忽略空白，不丢掉来源或数字，不依赖旧segment_position。

- General：0个唯一QA；
- Amazon：0个唯一QA；
- TikTok Shop：0个唯一QA；

全轮正确映射命中0次，唯一知识0条；错位3；无法核验0。检索Question/Answer、预期文本和metadata均保存在JSON qa_checks。

| 本地行 | 预期Question | 实际Question | 实际Answer | document / segment |
| --- | --- | --- | --- | --- |
| G0001 | 跨境电商中，目标市场筛选是什么？ | 核心是用需求、竞争、准入、物流和税费共同筛选可进入的国家或地区，而不是只看流量大小。跨境场景还要同时核对目的国要求、平台规则和实际履约能力。 | 将“目标市场筛选”纳入站点与SKU的上线清单。 | 614fb475-5f85-4e8c-a433-423740e3ca95 / 99241764-8af0-4bf9-bb13-2501257ded4e |
| G0003 | 如何建立目标市场筛选的最小执行清单？ | 先建立候选市场表，核对需求信号、竞品价格、禁限售、关税税费、派送时效和退货可行性。把结论写入可复查清单，未被证据支持的字段不作为上线依据。 | 先完成资料收集与逐项核对，再启动试运行。 | 614fb475-5f85-4e8c-a433-423740e3ca95 / 7fe021f1-f893-4f81-a557-f8fd4317fea7 |
| G0011 | 跨境电商中，需求验证是什么？ | 核心是通过关键词、类目、竞品评价和试单数据确认真实购买需求与未被满足的痛点。跨境场景还要同时核对目的国要求、平台规则和实际履约能力。 | 将“需求验证”纳入站点与SKU的上线清单。 | 614fb475-5f85-4e8c-a433-423740e3ca95 / f354ecc6-41a1-45a5-8eb2-24675020670b |

结构分类说明：FAIL_RETRIEVAL在此表示检索输入所引用知识结构未达标（导入/文档版本待核对），不等同于Hybrid或Rerank参数错误。P0要求停止本次后续验收，不代表API不可用。General发现错位后立即停止，所以Amazon与TikTok结构尚未核验。

## 冒烟

| ID | 结果 | 层 | 实际Top1 Question | 说明 |
| --- | --- | --- | --- | --- |

NOT_RUN：0/8，因结构前置核验阻塞，未发送任何冒烟请求。

## 完整54条

修复前：PASS 28，EXPECTED_GAP 9，NEEDS_REVIEW 9，FAIL 8。

尚未完成完整集：已执行0/54。按阻塞策略停止。

| 分组 | 数量 | PASS | EXPECTED_GAP | NEEDS_REVIEW | FAIL |
| --- | ---: | ---: | ---: | ---: | ---: |
| General | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| Policy | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| Amazon US（实际resolved） | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| TikTok US（实际resolved） | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |

知识类型与平台分组重叠，不能相加；平台使用真实resolved字段。

完整集未执行，Gap、Generation、Coverage、跨平台与跨站点指标均为NOT_RUN，不按零错误汇报。

候选跨平台/跨站点污染：NOT_RUN。

## 剩余P0/P1与修复方向

| ID | 分类 | 层 | 级别 | 问题 | 下一步 |
| --- | --- | --- | --- | --- | --- |
| STRUCT-G0001 | FAIL_RETRIEVAL | RETRIEVAL | P0 | 结构阻塞：实际检索返回的3条General仍为Question=CSV答案、Answer=关键行动；与旧评测同document/segment标识。未评价答案生成。 | 人工核对当前Workflow所连dataset/document、重处理任务与实际QA预览；先让正确映射出现在当前Workflow返回中。本轮不修改Dify或检索参数。 |

Bad Case收录所有非PASS，包括正确EXPECTED_GAP；正确缺口不是政策错误。完整回答、实际召回Question和Answer、上下文与事件均保存于新CSV/JSON；无法获取的字段为UNKNOWN。

## 工程与保护

含结构探测的真实Streaming：1/1 (100.0%)；开始节点逐字段回显原query与两个上下文：1/1 (100.0%)；检索输入等于retrieval_query：1/1 (100.0%)。

完整集延迟：NOT_RUN。结构请求的响应与首文本时间单独保存在JSON，不能作为54条延迟统计。

业务、知识基线及旧评测哈希保护：PASS（168文件）；变化：无。评测不读取密钥，不调用Dify管理API。

- TypeScript：{"result":"PASS","exit_code":0,"command":"node node_modules/typescript/bin/tsc --noEmit","note":"build完成后顺序执行。"}
- lint：{"result":"PASS","exit_code":0,"command":"node node_modules/next/dist/bin/next lint","warnings":8,"note":"保留既有Hook/unused参数警告与Next工具提示。"}
- build：{"result":"PASS","exit_code":0,"command":"node node_modules/next/dist/bin/next build","note":"Next.js 15.5.25构建成功；未清理既有警告。"}
- unit_tests：{"result":"PASS","exit_code":0,"command":"node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test tests/*.test.mjs","tests":12,"passed":12,"failed":0,"note":"隔离单元测试与唯一真实结构请求分别统计。"}

产物安全检查：PASS；9个本轮评测文件及29个客户端JS产物未含真实API Key；未打印密钥或Authorization值。

## 验收

FAIL

结构前置验收阻塞。唯一结构请求返回G0001/G0003/G0011，三条仍为Question=CSV答案、Answer=CSV关键行动，dataset/document/segment标识与旧评测相同。正确映射尚未在当前Workflow返回中得到确认；Amazon/TikTok结构、8条冒烟和54条完整集均未执行。这不是修复后知识质量FAIL结论，也不能据此判断千问Prompt质量。旧28/9/9/8只作为历史结果保留。

当前不建议修改千问Prompt：尚无修复映射后的Generation Error证据。先让正确映射进入当前Workflow，再按原测试集区分Coverage、Retrieval与正确知识已召回后的Generation。

阻塞：实际QA映射仍错位，立即停止后续测试。
阻塞：真实调用或映射检查失败，停止后续请求。
阻塞：尚未核验三个分组各至少3条正确QA，停止后续测试。

未修改生产代码、前端、模型、Prompt、知识正文、检索参数、Context Resolution或Router；未commit、未部署。旧结果完整保留。
