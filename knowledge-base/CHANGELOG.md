# 知识库更新日志

## Policy KB v0.1 — 2026-10-03

状态：离线候选交付，等待人工审核；尚未导入 Dify。官方正文实际核验于2026-10-02，最终文件检查于2026-10-03。

- 新增平台：Amazon、TikTok Shop。
- 新增站点：两个平台各自的美国站，不扩大到其他站点。
- 新增：124条，Amazon 59条、TikTok Shop 65条。
- 修改：0条已有Policy知识；废弃：0条已发布Policy知识。
- General：原始500条完整保留，工作副本字节一致，无扩写或清洗。
- 研究复核排除5条争议草稿，另保留8组官方表述/范围差异，不计入已发布条目废弃数。
- 官方来源：43个支撑候选QA的页面，Amazon 23、TikTok Shop 20。
- 未解决Gap：25项。
- 测试集：54条，General 10、Policy 29、Expected Gap 15；全部未执行Dify联调。
- 质量检查：0错误、28条条件性措辞提示；校验器16项隔离测试通过。

### 主题覆盖

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

### 主要来源

Amazon使用实际打开的Sell on Amazon/Selling Partner官方指南、公开政策页面及Amazon Ads官方指南；TikTok使用实际打开的美国Seller University政策正文。页面标题、URL、日期、受影响QA行号详见 `policy/yuehai_policy_kb_v1_sources.csv`。

### 已知限制

7个来源无明确页面日期，43个来源没有确认整页统一生效日期；不补造日期。Amazon部分详细Help无法读取，TikTok部分费率及结算图片未核验。争议规则保留Gap并等待人工或官方确认。ACOS/ROAS为General覆盖缺口；Amazon英国站及其他平台/市场不属于本版范围。

QA中写入平台和站点仅支持现有文本检索区分范围，没有实现metadata filtering。离线校验不能证明线上召回或回答质量。未修改网站、API、Workflow、Prompt、模型、Streaming或上下文逻辑；未提交commit或部署。

人工审查与完整交付说明见 `reports/manual-review.md` 和 `reports/mvp-0.3-summary.md`。
