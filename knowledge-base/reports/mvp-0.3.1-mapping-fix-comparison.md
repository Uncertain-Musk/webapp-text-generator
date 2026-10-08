# MVP 0.3.1｜QA映射修复前后比较

日期：2026-10-04（Asia/Shanghai）；新run_id：303fb36a-37c1-4582-9087-5af2d32812fc。

结构核验：BLOCKED；General 0条（）；Amazon 0条（）；TikTok Shop 0条（）。

| ID | 修复前 | 修复后 | 修复后证据与判断 |
| --- | --- | --- | --- |
| A01 | FAIL_COVERAGE | NOT_RUN | 未执行 |
| A02 | PASS | NOT_RUN | 未执行 |
| A03 | FAIL_GENERATION | NOT_RUN | 未执行 |
| A04 | PASS | NOT_RUN | 未执行 |
| A05 | PASS | NOT_RUN | 未执行 |
| A06 | FAIL_RETRIEVAL | NOT_RUN | 未执行 |
| A07 | EXPECTED_GAP | NOT_RUN | 未执行 |
| A08 | PASS | NOT_RUN | 未执行 |

旧结果为导入映射错位下的历史观察，不能作为最终知识库质量结论。结果变化与映射修复一致时仅说明观察到改善；这是单次前后比较，无法排除模型随机性，不把全部变化自动归因于映射。

完整集修复前：PASS 28 / EXPECTED_GAP 9 / NEEDS_REVIEW 9 / FAIL 8。修复后NOT_RUN/INCOMPLETE：已执行0/54，不生成通过率或错误数结论。未执行部分不是0错误。

| 指标 | 修复前 | 修复后 |
| --- | --- | --- |
| Policy通过率 | 22/29 (75.9%) | NOT_RUN/INCOMPLETE |
| General通过率 | 6/10 (60.0%) | NOT_RUN/INCOMPLETE |
| Generation Error（历史分类） | 5 | NOT_RUN/INCOMPLETE |
| Retrieval Error | 1 | NOT_RUN/INCOMPLETE |
| 正确Gap兜底率 | 10/15 (66.7%) | NOT_RUN/INCOMPLETE |
| 跨平台最终错误 | 0 | NOT_RUN/INCOMPLETE |
| 跨站点最终错误 | 0 | NOT_RUN/INCOMPLETE |

本轮只有正确QA已召回且最终明显错答才能标FAIL_GENERATION。旧版5条Generation中的TEST-040/041有正确规则已召回证据；TEST-017/036/037不能直接用来证明Prompt缺陷。旧文件保留原分类，新报告说明标准差异，不覆盖旧结果。

阻塞：实际QA映射仍错位，立即停止后续测试。
阻塞：真实调用或映射检查失败，停止后续请求。
阻塞：尚未核验三个分组各至少3条正确QA，停止后续测试。

本轮检索仍返回原General文档的三个旧segment，未观察到索引2/3映射。QA修复的通过率提升、政策错误消失数量和Gap改善幅度均无法计算。下一步由人工核对当前Workflow实际引用的dataset/document、重处理是否完成及QA预览；确保Question=问题、Answer=完整答案真实可检索，再重新启动结构阶段。当前唯一P0为结构阻塞，分类RETRIEVAL仅定位知识导入/引用文档层，不说明Hybrid或Rerank参数有错。
