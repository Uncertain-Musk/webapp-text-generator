# Shopee 广告 P0 候选：简洁导入版

本目录提供最新广告专题的两份导入文件，合计 58 条：

| 文件 | 内容 | 条数 |
| --- | --- | --- |
| [shopee_ads_qa.csv](shopee_ads_qa.csv) | 原 20 条广告 QA 与新增 30 条 P0 场景 QA | 50 |
| [shopee_market_insights_qa.csv](shopee_market_insights_qa.csv) | 原行业研究 QA，字节不变 | 8 |

两份 CSV 严格使用 `question,answer`，Question 为第一列，Answer 为第二列。原 28 条正文保留，8 项修订建议尚未应用。涉及站点、广告类型和时效的限制见答案及来源记录；本批不能代表所有 Shopee 站点的广告规则。

来源索引、17 个来源目录、51 条新增知识证据映射、38 条新增及修订记录、58 条逐题审计、54 条独立评测题集中保存于 [review.json](review.json)，对应字段依次为 `source_index`、`source_catalog`、`qa_evidence`、`changes_and_revision_proposals`、`coverage_audit`、`independent_evaluation`。这些管理数据不导入 Dify。

先阅读 [覆盖审计](QA覆盖审计报告.md)、[13 项知识缺口](Knowledge_Gap.md)及 [Dify 导入与测试说明](Dify_QA导入及测试操作说明.md)。在仓库根目录运行：

```powershell
python script/validate-shopee-p0-package.py
```

检查只验证本地结构、映射、正文哈希和原始基线保留，不重新核验外部政策，也不证明真实检索成功。54 条评测实际结果全部为“未执行”；需人工在隔离 Dify 测试库导入、执行并保留真实召回证据。

上级目录的 `shopee_all_qa.csv` 为另一份 97 条基线，包含原 28 条及 69 条多站点经营 QA。本目录 58 条与其重叠 28 条，不同时完整导入。若将两批整合，独立知识总数为 127 条，应先审核旧答案修订与重复文档处理，再生成单一导入文件。本次仅打包现有候选，不自动整合或应用修订，不修改 Dify、Workflow、模型或生产配置。
