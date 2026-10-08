# Yuehai knowledge-base validation

Audit cutoff: 2026-10-03

Status: **passed_with_warnings**. Errors: 0; warnings: 28.

## Scope and limits

- Local validation does not fetch official pages or independently verify the asserted last-verified dates.
- Similarity and answer signatures identify review candidates; zero candidates does not prove zero semantic conflicts.
- CSV evaluation rows are test cases; this script does not execute Dify retrieval or score live answers.

No input CSV was written or cleaned. Row IDs refer to 1-based data rows, excluding the header.

## File statistics

| File | Data rows | UTF-8 BOM | Bytes | Multiline records |
|---|---:|---|---:|---:|
| original | 500 | True | 171622 | 0 |
| general | 500 | True | 171622 | 0 |
| policy | 124 | True | 80187 | 0 |
| sources | 43 | True | 25956 | 0 |
| test_queries | 54 | True | 10778 | 0 |
| gaps | 25 | True | 8411 | 0 |

## Original and General fidelity

Original SHA256: `534a5c9866ea602e46f99bf843e52768967eafc0f33572e6d7be60e82ea52088`

Parsed matrices equal: **True**; byte identical: **True**.

Original unchanged during validation: **True**.

## Original topic distribution

| First level | Second level | Rows |
|---|---|---:|
| 合规与知识产权 | 中国海关 | 10 |
| 合规与知识产权 | 产品安全 | 10 |
| 合规与知识产权 | 原产地 | 10 |
| 合规与知识产权 | 商品归类 | 10 |
| 合规与知识产权 | 标签 | 10 |
| 合规与知识产权 | 生产者责任 | 10 |
| 合规与知识产权 | 知识产权 | 10 |
| 合规与知识产权 | 禁限售 | 10 |
| 合规与知识产权 | 税务合规 | 10 |
| 定价、税费与利润 | 促销 | 10 |
| 定价、税费与利润 | 利润 | 10 |
| 定价、税费与利润 | 售价 | 10 |
| 定价、税费与利润 | 汇率 | 10 |
| 定价、税费与利润 | 现金流 | 10 |
| 定价、税费与利润 | 税费预算 | 10 |
| 定价、税费与利润 | 贸易术语 | 10 |
| 平台运营与增长 | 商品管理 | 10 |
| 平台运营与增长 | 商品页 | 20 |
| 平台运营与增长 | 广告 | 20 |
| 平台运营与增长 | 本地化 | 10 |
| 平台运营与增长 | 账户健康 | 10 |
| 平台运营与增长 | 转化 | 10 |
| 开店与市场 | 品牌定位 | 10 |
| 开店与市场 | 市场调研 | 10 |
| 开店与市场 | 市场选择 | 10 |
| 开店与市场 | 经营模式 | 10 |
| 开店与市场 | 账户开设 | 10 |
| 收款、客服与风险 | 交易风险 | 10 |
| 收款、客服与风险 | 售后 | 10 |
| 收款、客服与风险 | 客服 | 10 |
| 收款、客服与风险 | 对账 | 10 |
| 收款、客服与风险 | 库存协同 | 10 |
| 收款、客服与风险 | 收款 | 10 |
| 收款、客服与风险 | 数据 | 10 |
| 收款、客服与风险 | 组织与应急 | 10 |
| 收款、客服与风险 | 预测 | 10 |
| 物流与履约 | 包装 | 10 |
| 物流与履约 | 发货时效 | 10 |
| 物流与履约 | 国际运输 | 10 |
| 物流与履约 | 履约模式 | 10 |
| 物流与履约 | 库存 | 10 |
| 物流与履约 | 清关 | 10 |
| 物流与履约 | 退货物流 | 10 |
| 选品与采购 | 供应商管理 | 10 |
| 选品与采购 | 差异化 | 10 |
| 选品与采购 | 样品与质检 | 10 |
| 选品与采购 | 选品 | 10 |
| 选品与采购 | 采购成本 | 10 |

| Column | Empty values | Row IDs |
|---|---:|---|
| 一级主题 | 0 |  |
| 二级主题 | 0 |  |
| 问题 | 0 |  |
| 答案 | 0 |  |
| 关键行动 | 0 |  |

## General topic distribution

| First level | Second level | Rows |
|---|---|---:|
| 合规与知识产权 | 中国海关 | 10 |
| 合规与知识产权 | 产品安全 | 10 |
| 合规与知识产权 | 原产地 | 10 |
| 合规与知识产权 | 商品归类 | 10 |
| 合规与知识产权 | 标签 | 10 |
| 合规与知识产权 | 生产者责任 | 10 |
| 合规与知识产权 | 知识产权 | 10 |
| 合规与知识产权 | 禁限售 | 10 |
| 合规与知识产权 | 税务合规 | 10 |
| 定价、税费与利润 | 促销 | 10 |
| 定价、税费与利润 | 利润 | 10 |
| 定价、税费与利润 | 售价 | 10 |
| 定价、税费与利润 | 汇率 | 10 |
| 定价、税费与利润 | 现金流 | 10 |
| 定价、税费与利润 | 税费预算 | 10 |
| 定价、税费与利润 | 贸易术语 | 10 |
| 平台运营与增长 | 商品管理 | 10 |
| 平台运营与增长 | 商品页 | 20 |
| 平台运营与增长 | 广告 | 20 |
| 平台运营与增长 | 本地化 | 10 |
| 平台运营与增长 | 账户健康 | 10 |
| 平台运营与增长 | 转化 | 10 |
| 开店与市场 | 品牌定位 | 10 |
| 开店与市场 | 市场调研 | 10 |
| 开店与市场 | 市场选择 | 10 |
| 开店与市场 | 经营模式 | 10 |
| 开店与市场 | 账户开设 | 10 |
| 收款、客服与风险 | 交易风险 | 10 |
| 收款、客服与风险 | 售后 | 10 |
| 收款、客服与风险 | 客服 | 10 |
| 收款、客服与风险 | 对账 | 10 |
| 收款、客服与风险 | 库存协同 | 10 |
| 收款、客服与风险 | 收款 | 10 |
| 收款、客服与风险 | 数据 | 10 |
| 收款、客服与风险 | 组织与应急 | 10 |
| 收款、客服与风险 | 预测 | 10 |
| 物流与履约 | 包装 | 10 |
| 物流与履约 | 发货时效 | 10 |
| 物流与履约 | 国际运输 | 10 |
| 物流与履约 | 履约模式 | 10 |
| 物流与履约 | 库存 | 10 |
| 物流与履约 | 清关 | 10 |
| 物流与履约 | 退货物流 | 10 |
| 选品与采购 | 供应商管理 | 10 |
| 选品与采购 | 差异化 | 10 |
| 选品与采购 | 样品与质检 | 10 |
| 选品与采购 | 选品 | 10 |
| 选品与采购 | 采购成本 | 10 |

| Column | Empty values | Row IDs |
|---|---:|---|
| 一级主题 | 0 |  |
| 二级主题 | 0 |  |
| 问题 | 0 |  |
| 答案 | 0 |  |
| 关键行动 | 0 |  |

## Policy topic distribution

| First level | Second level | Rows |
|---|---|---:|
| Amazon｜美国站 | 商品发布 | 10 |
| Amazon｜美国站 | 商品合规 | 6 |
| Amazon｜美国站 | 广告与经营 | 9 |
| Amazon｜美国站 | 物流 | 7 |
| Amazon｜美国站 | 申诉 | 1 |
| Amazon｜美国站 | 订单履约 | 5 |
| Amazon｜美国站 | 账号与违规 | 4 |
| Amazon｜美国站 | 费用与结算 | 9 |
| Amazon｜美国站 | 退款退货 | 8 |
| TikTok Shop｜美国站 | 商品发布 | 4 |
| TikTok Shop｜美国站 | 商品合规 | 16 |
| TikTok Shop｜美国站 | 广告与经营 | 3 |
| TikTok Shop｜美国站 | 物流 | 9 |
| TikTok Shop｜美国站 | 申诉 | 6 |
| TikTok Shop｜美国站 | 订单履约 | 9 |
| TikTok Shop｜美国站 | 账号与违规 | 6 |
| TikTok Shop｜美国站 | 费用与结算 | 4 |
| TikTok Shop｜美国站 | 退款退货 | 8 |

| Column | Empty values | Row IDs |
|---|---:|---|
| 一级主题 | 0 |  |
| 二级主题 | 0 |  |
| 问题 | 0 |  |
| 答案 | 0 |  |
| 关键行动 | 0 |  |

## Source audit coverage

Source rows: **43**; unique source URLs: **43**; mapped policy rows: **124**.

| Source ID | Platform / market | Topic | Source URL | Supported policy row IDs | Last verified |
|---|---|---|---|---|---|
| AMZ-S01 | Amazon / US | 申诉;退款退货 | https://sell.amazon.com/blog/manage-customer-returns | P0001;P0002;P0003;P0004;P0005;P0006 | 2026-10-02 |
| AMZ-S02 | Amazon / US | 费用与结算;退款退货 | https://sell.amazon.com/blog/announcements/upgrades-to-customer-service-by-amazon | P0007;P0008 | 2026-10-02 |
| AMZ-S03 | Amazon / US | 商品合规 | https://sell.amazon.com/blog/manage-your-compliance | P0009;P0010 | 2026-10-02 |
| AMZ-S04 | Amazon / US | 商品合规;订单履约 | https://sell.amazon.com/blog/how-to-sell-groceries-amazon | P0011;P0012;P0013 | 2026-10-02 |
| AMZ-S05 | Amazon / US | 账号与违规 | https://sell.amazon.com/blog/selling-policies | P0014;P0015;P0016;P0017 | 2026-10-02 |
| AMZ-S06 | Amazon / US | 订单履约 | https://sell.amazon.com/blog/amazon-order-management | P0018;P0019;P0020 | 2026-10-02 |
| AMZ-S07 | Amazon / US | 物流 | https://sell.amazon.com/tools/buy-shipping | P0021;P0022 | 2026-10-02 |
| AMZ-S08 | Amazon / US | 商品合规 | https://sell.amazon.com/blog/how-to-sell-health-personal-care | P0023;P0024 | 2026-10-02 |
| AMZ-S09 | Amazon / US | 商品发布 | https://sell.amazon.com/blog/sell-generic-products | P0025;P0026;P0027 | 2026-10-02 |
| AMZ-S10 | Amazon / US | 商品发布 | https://sell.amazon.com/blog/amazon-listing-errors | P0028;P0029 | 2026-10-02 |
| AMZ-S11 | Amazon / US | 商品发布 | https://sell.amazon.com/blog/product-photos | P0030;P0031 | 2026-10-02 |
| AMZ-S12 | Amazon / US | 商品发布 | https://sell.amazon.com/blog/amazon-product-listings | P0032;P0033;P0034 | 2026-10-02 |
| AMZ-S13 | Amazon / US | 订单履约;退款退货 | https://sell.amazon.com/blog/dropshipping-on-amazon | P0035;P0036 | 2026-10-02 |
| AMZ-S14 | Amazon / US | 物流 | https://sell.amazon.com/blog/fba-packaging-prep-labeling | P0037;P0038 | 2026-10-02 |
| AMZ-S15 | Amazon / US | 物流 | https://sell.amazon.com/blog/fba-shipment-tracking | P0039;P0040;P0041 | 2026-10-02 |
| AMZ-S16 | Amazon / US | 费用与结算 | https://sell.amazon.com/blog/fba-fees-guide | P0042;P0043 | 2026-10-02 |
| AMZ-S17 | Amazon / US | 费用与结算 | https://sell.amazon.com/pricing | P0044;P0045;P0046 | 2026-10-02 |
| AMZ-S18 | Amazon / US | 费用与结算 | https://sell.amazon.com/blog/amazon-seller-payments | P0047;P0048 | 2026-10-02 |
| AMZ-S19 | Amazon / US | 广告与经营 | https://advertising.amazon.com/library/guides/sponsored-brands-display-ads-moderation | P0049;P0050;P0051 | 2026-10-02 |
| AMZ-S20 | Amazon / US | 广告与经营 | https://advertising.amazon.com/solutions/products/sponsored-products | P0052;P0053 | 2026-10-02 |
| AMZ-S21 | Amazon / US | 广告与经营 | https://sell.amazon.com/tools/customer-reviews | P0054;P0055 | 2026-10-02 |
| AMZ-S22 | Amazon / US | 广告与经营;费用与结算 | https://sell.amazon.com/programs/vine | P0056;P0057;P0058 | 2026-10-02 |
| AMZ-S23 | Amazon / US | 退款退货 | https://sell.amazon.com/programs/fulfilled-by-merchant | P0059 | 2026-10-02 |
| TTS-S01 | TikTok Shop / US | 退款退货 | https://seller-us.tiktok.com/university/essay?knowledge_id=984433248438058 | P0060 | 2026-10-02 |
| TTS-S02 | TikTok Shop / US | 订单履约;退款退货 | https://seller-us.tiktok.com/university/essay?knowledge_id=3253210454181634 | P0061;P0062;P0063;P0064;P0065 | 2026-10-02 |
| TTS-S03 | TikTok Shop / US | 申诉 | https://seller-us.tiktok.com/university/essay?course_type=1&from=search&identity=1&knowledge_id=3985068541478658&role=1 | P0066;P0067;P0068 | 2026-10-02 |
| TTS-S04 | TikTok Shop / US | 退款退货 | https://seller-us.tiktok.com/university/essay?knowledge_id=5914428974778167 | P0069;P0070;P0071 | 2026-10-02 |
| TTS-S05 | TikTok Shop / US | 申诉;账号与违规;费用与结算 | https://seller-us.tiktok.com/university/essay?course_type=1&from=search&identity=1&knowledge_id=2380042836166443&role=1 | P0072;P0073;P0074;P0075;P0076 | 2026-10-02 |
| TTS-S06 | TikTok Shop / US | 账号与违规 | https://seller-us.tiktok.com/university/essay?knowledge_id=6750828276418350 | P0077;P0078;P0079;P0080 | 2026-10-02 |
| TTS-S07 | TikTok Shop / US | 商品合规 | https://seller-us.tiktok.com/university/essay?knowledge_id=1399532709988097 | P0081;P0082;P0083;P0084 | 2026-10-02 |
| TTS-S08 | TikTok Shop / US | 商品合规 | https://seller-us.tiktok.com/university/essay?knowledge_id=3238037484275457&lang=en | P0085;P0086;P0087 | 2026-10-02 |
| TTS-S09 | TikTok Shop / US | 商品发布 | https://seller-us.tiktok.com/university/essay?knowledge_id=3196690250417921 | P0088;P0089;P0090;P0091 | 2026-10-02 |
| TTS-S10 | TikTok Shop / US | 商品合规 | https://seller-us.tiktok.com/university/essay?default_language=en&knowledge_id=6837901778306818 | P0092;P0093;P0094 | 2026-10-02 |
| TTS-S11 | TikTok Shop / US | 商品合规 | https://seller-us.tiktok.com/university/essay?knowledge_id=1439743821383425 | P0095;P0096;P0097 | 2026-10-02 |
| TTS-S12 | TikTok Shop / US | 订单履约 | https://seller-us.tiktok.com/university/essay?knowledge_id=3995852763301633 | P0098;P0099;P0100 | 2026-10-02 |
| TTS-S13 | TikTok Shop / US | 申诉;订单履约 | https://seller-us.tiktok.com/university/essay?knowledge_id=3668989549299511 | P0101;P0102;P0103 | 2026-10-02 |
| TTS-S14 | TikTok Shop / US | 订单履约 | https://seller-us.tiktok.com/university/essay?knowledge_id=7953001314830094 | P0104;P0105;P0106 | 2026-10-02 |
| TTS-S15 | TikTok Shop / US | 物流 | https://seller-us.tiktok.com/university/essay?knowledge_id=7671875816589099 | P0107;P0108;P0109 | 2026-10-02 |
| TTS-S16 | TikTok Shop / US | 物流 | https://seller-us.tiktok.com/university/essay?knowledge_id=1274968588748558 | P0110;P0111;P0112 | 2026-10-02 |
| TTS-S17 | TikTok Shop / US | 物流 | https://seller-us.tiktok.com/university/essay?knowledge_id=6837879804970754 | P0113;P0114;P0115 | 2026-10-02 |
| TTS-S18 | TikTok Shop / US | 商品合规 | https://seller-us.tiktok.com/university/essay?knowledge_id=2297870046414638 | P0116;P0117;P0118 | 2026-10-02 |
| TTS-S19 | TikTok Shop / US | 广告与经营 | https://seller-us.tiktok.com/university/essay?knowledge_id=10019322 | P0119;P0120;P0121 | 2026-10-02 |
| TTS-S20 | TikTok Shop / US | 费用与结算 | https://seller-us.tiktok.com/university/essay?course_type=1&from=search&identity=1&knowledge_id=3995852763531009&role=1 | P0122;P0123;P0124 | 2026-10-02 |

## Evaluation distributions

| Dimension | Values | Rows |
|---|---|---:|
| expected_kb | Expected Gap | 15 |
| expected_kb | General KB | 10 |
| expected_kb | Policy KB | 29 |
| query_type | ambiguous | 1 |
| query_type | colloquial | 9 |
| query_type | expected_gap | 7 |
| query_type | general_concept | 10 |
| query_type | known_gap | 7 |
| query_type | natural | 6 |
| query_type | platform_conflict | 2 |
| query_type | short | 12 |
| platform_market |  /  | 13 |
| platform_market | Amazon / UK | 1 |
| platform_market | Amazon / US | 19 |
| platform_market | Shopee / SG | 1 |
| platform_market | Temu / US | 1 |
| platform_market | TikTok Shop / UK | 1 |
| platform_market | TikTok Shop / US | 18 |
| topic | 产品安全 | 1 |
| topic | 供应商管理 | 1 |
| topic | 利润 | 1 |
| topic | 商品发布 | 5 |
| topic | 商品合规 | 2 |
| topic | 履约模式 | 1 |
| topic | 市场调研 | 1 |
| topic | 市场选择 | 1 |
| topic | 广告与经营 | 5 |
| topic | 库存 | 1 |
| topic | 物流 | 4 |
| topic | 现金流 | 1 |
| topic | 申诉 | 4 |
| topic | 税务合规 | 1 |
| topic | 订单履约 | 4 |
| topic | 账号与违规 | 3 |
| topic | 费用与结算 | 5 |
| topic | 退款退货 | 12 |
| topic | 选品 | 1 |
| status | not_run | 54 |

## Knowledge gaps distributions

| Dimension | Values | Rows |
|---|---|---:|
| platform_market |  /  | 1 |
| platform_market | Amazon / UK | 1 |
| platform_market | Amazon / US | 9 |
| platform_market | General /  | 2 |
| platform_market | Shopee / SG | 1 |
| platform_market | Temu / US | 1 |
| platform_market | TikTok Shop / UK | 1 |
| platform_market | TikTok Shop / US | 9 |
| topic | 商品合规 | 1 |
| topic | 广告与经营 | 4 |
| topic | 物流 | 1 |
| topic | 申诉 | 3 |
| topic | 订单履约 | 1 |
| topic | 账号与违规 | 1 |
| topic | 费用与结算 | 3 |
| topic | 退款退货 | 11 |
| type | context_ambiguity | 1 |
| type | general_coverage | 2 |
| type | knowledge_coverage | 4 |
| type | store_data_unavailable | 1 |
| type | 同页时限适用冲突 | 1 |
| type | 同页规则与检查清单冲突 | 1 |
| type | 后台详细规则未核验 | 1 |
| type | 图片表格未核验 | 1 |
| type | 官方指南范围冲突 | 1 |
| type | 官方条款冲突 | 1 |
| type | 官方正文无法读取 | 2 |
| type | 官方正文需要登录 | 1 |
| type | 官方费率来源未完成核验 | 1 |
| type | 官方页面时限冲突 | 1 |
| type | 官方页面认定边界冲突 | 1 |
| type | 摘要与详细条件冲突 | 1 |
| type | 流程及证据格式边界冲突 | 1 |
| type | 独立广告政策正文未核验 | 1 |
| type | 详细买家政策原页无法读取 | 1 |
| type | 详细扣费规则未核验 | 1 |
| status | needs_clarification | 1 |
| status | open | 2 |
| status | out_of_scope | 5 |
| status | 待官方澄清 | 6 |
| status | 待核验 | 8 |
| status | 待核验图片或Seller Center | 1 |
| status | 待补充官方广告政策 | 1 |
| status | 待补充官方费率明细 | 1 |

## Highly similar questions

Both thresholds must hold after platform and market words are removed: SequenceMatcher ≥ 0.84 and character bigram Jaccard ≥ 0.60. Candidates require manual review.

| File | Row IDs | Topic | SequenceMatcher | Bigram Jaccard | Questions |
|---|---|---|---:|---:|---|

## Potential answer differences

Manual-review candidates: **0**. This count does not establish whether semantic conflicts exist.

| Row IDs | Topic | Answer signatures |
|---|---|---|

## Errors (0)

| Code | File | Row IDs | Finding | Details |
|---|---|---|---|---|

## Warnings (28)

| Code | File | Row IDs | Finding | Details |
|---|---|---|---|---|
| CONDITIONAL_LANGUAGE_REVIEW | yuehai_general_kb_v2.csv | G0106 | Review whether the answer states conditions and applicability clearly. | {"terms": ["可能"]} |
| CONDITIONAL_LANGUAGE_REVIEW | yuehai_general_kb_v2.csv | G0111 | Review whether the answer states conditions and applicability clearly. | {"terms": ["可能"]} |
| CONDITIONAL_LANGUAGE_REVIEW | yuehai_general_kb_v2.csv | G0118 | Review whether the answer states conditions and applicability clearly. | {"terms": ["可能"]} |
| CONDITIONAL_LANGUAGE_REVIEW | yuehai_general_kb_v2.csv | G0122 | Review whether the answer states conditions and applicability clearly. | {"terms": ["可能"]} |
| CONDITIONAL_LANGUAGE_REVIEW | yuehai_general_kb_v2.csv | G0156 | Review whether the answer states conditions and applicability clearly. | {"terms": ["可能"]} |
| CONDITIONAL_LANGUAGE_REVIEW | yuehai_general_kb_v2.csv | G0161 | Review whether the answer states conditions and applicability clearly. | {"terms": ["可能"]} |
| CONDITIONAL_LANGUAGE_REVIEW | yuehai_general_kb_v2.csv | G0168 | Review whether the answer states conditions and applicability clearly. | {"terms": ["可能"]} |
| CONDITIONAL_LANGUAGE_REVIEW | yuehai_general_kb_v2.csv | G0171 | Review whether the answer states conditions and applicability clearly. | {"terms": ["可能"]} |
| CONDITIONAL_LANGUAGE_REVIEW | yuehai_general_kb_v2.csv | G0178 | Review whether the answer states conditions and applicability clearly. | {"terms": ["可能"]} |
| CONDITIONAL_LANGUAGE_REVIEW | yuehai_general_kb_v2.csv | G0191 | Review whether the answer states conditions and applicability clearly. | {"terms": ["通常"]} |
| CONDITIONAL_LANGUAGE_REVIEW | yuehai_general_kb_v2.csv | G0198 | Review whether the answer states conditions and applicability clearly. | {"terms": ["通常"]} |
| CONDITIONAL_LANGUAGE_REVIEW | yuehai_general_kb_v2.csv | G0242 | Review whether the answer states conditions and applicability clearly. | {"terms": ["可能"]} |
| CONDITIONAL_LANGUAGE_REVIEW | yuehai_general_kb_v2.csv | G0306 | Review whether the answer states conditions and applicability clearly. | {"terms": ["可能"]} |
| CONDITIONAL_LANGUAGE_REVIEW | yuehai_general_kb_v2.csv | G0392 | Review whether the answer states conditions and applicability clearly. | {"terms": ["通常"]} |
| CONDITIONAL_LANGUAGE_REVIEW | yuehai_general_kb_v2.csv | G0406 | Review whether the answer states conditions and applicability clearly. | {"terms": ["可能"]} |
| CONDITIONAL_LANGUAGE_REVIEW | yuehai_policy_kb_v1.csv | P0005 | Review whether the answer states conditions and applicability clearly. | {"terms": ["可能"]} |
| CONDITIONAL_LANGUAGE_REVIEW | yuehai_policy_kb_v1.csv | P0015 | Review whether the answer states conditions and applicability clearly. | {"terms": ["一般"]} |
| CONDITIONAL_LANGUAGE_REVIEW | yuehai_policy_kb_v1.csv | P0033 | Review whether the answer states conditions and applicability clearly. | {"terms": ["可能"]} |
| CONDITIONAL_LANGUAGE_REVIEW | yuehai_policy_kb_v1.csv | P0039 | Review whether the answer states conditions and applicability clearly. | {"terms": ["可能"]} |
| CONDITIONAL_LANGUAGE_REVIEW | yuehai_policy_kb_v1.csv | P0044 | Review whether the answer states conditions and applicability clearly. | {"terms": ["可能"]} |
| CONDITIONAL_LANGUAGE_REVIEW | yuehai_policy_kb_v1.csv | P0046 | Review whether the answer states conditions and applicability clearly. | {"terms": ["可能"]} |
| CONDITIONAL_LANGUAGE_REVIEW | yuehai_policy_kb_v1.csv | P0047 | Review whether the answer states conditions and applicability clearly. | {"terms": ["一般"]} |
| CONDITIONAL_LANGUAGE_REVIEW | yuehai_policy_kb_v1.csv | P0048 | Review whether the answer states conditions and applicability clearly. | {"terms": ["通常"]} |
| CONDITIONAL_LANGUAGE_REVIEW | yuehai_policy_kb_v1.csv | P0061 | Review whether the answer states conditions and applicability clearly. | {"terms": ["可能"]} |
| CONDITIONAL_LANGUAGE_REVIEW | yuehai_policy_kb_v1.csv | P0085 | Review whether the answer states conditions and applicability clearly. | {"terms": ["可能"]} |
| CONDITIONAL_LANGUAGE_REVIEW | yuehai_policy_kb_v1.csv | P0102 | Review whether the answer states conditions and applicability clearly. | {"terms": ["可能"]} |
| CONDITIONAL_LANGUAGE_REVIEW | yuehai_policy_kb_v1.csv | P0107 | Review whether the answer states conditions and applicability clearly. | {"terms": ["一般"]} |
| CONDITIONAL_LANGUAGE_REVIEW | yuehai_policy_kb_v1.csv | P0108 | Review whether the answer states conditions and applicability clearly. | {"terms": ["可能"]} |
