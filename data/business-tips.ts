export type BusinessTip = {
  id: number
  category: string
  content: string
}

export const BUSINESS_TIPS_PER_BATCH = 6

export const BUSINESS_TIPS: BusinessTip[] = [
  {
    id: 1,
    category: '库存',
    content: '库存不要只看剩余件数，同时关注销售速度和补货周期，避免畅销品断货和补货失误。',
  },
  {
    id: 2,
    category: '广告',
    content: '广告点击高但转化低时，先检查 Listing、价格和评价，再决定是否提高预算。',
  },
  {
    id: 3,
    category: 'Listing',
    content: '新品上线初期不要同时修改过多变量，否则很难判断销量变化来自哪一次调整。',
  },
  {
    id: 4,
    category: '数据',
    content: '每周固定复盘流量、点击率、转化率和广告成本，避免只根据最终销量判断效果。',
  },
  {
    id: 5,
    category: '备货',
    content: '备货时同时考虑销量预测和供应链交期，为旺季、物流延迟和需求波动预留安全库存。',
  },
  {
    id: 6,
    category: '库存',
    content: '长期低周转商品应尽早判断降价、促销或清库存，避免持续承担仓储成本和资金占用。',
  },
  {
    id: 7,
    category: 'Listing',
    content: 'Listing 优化应保证标题、主图和核心卖点一致，减少用户点击后的预期落差。',
  },
  {
    id: 8,
    category: '售后',
    content: '退货率上升时先按 SKU 和退货原因拆分，再判断问题来自商品、描述还是物流。',
  },
  {
    id: 9,
    category: '多平台',
    content: '多平台经营要及时同步可售库存，避免同一批货被不同渠道重复销售并产生超卖风险。',
  },
  {
    id: 10,
    category: '广告',
    content: '不要只追求低 ACOS，还要结合毛利、自然订单和整体销售额判断广告价值。',
  },
  {
    id: 11,
    category: '评价',
    content: '处理差评时先归类问题来源，重复出现的问题应回到产品或履约流程中解决，避免反复发生。',
  },
  {
    id: 12,
    category: '物流',
    content: '物流方案不能只比较单票运费，还应同时考虑时效、稳定性、异常处理成本和沟通效率。',
  },
  {
    id: 13,
    category: '选品',
    content: '评估新品时同时核算需求、竞争、毛利和退货风险，避免只看搜索热度做决定。',
  },
  {
    id: 14,
    category: '现金流',
    content: '采购计划应结合回款周期与固定支出，先保证现金流安全和运营弹性，再追求库存规模。',
  },
  {
    id: 15,
    category: '转化',
    content: '转化率突然下降时，先对比流量来源和访客质量，再检查页面、价格与促销因素的变化。',
  },
  {
    id: 16,
    category: '广告',
    content: '广告关键词应按搜索意图分组管理，定期排除无关流量，减少预算被低质量点击消耗。',
  },
  {
    id: 17,
    category: '物流',
    content: '为核心物流线路准备可切换的备选方案，出现延误时才能快速控制履约影响和客户体验。',
  },
  {
    id: 18,
    category: '数据',
    content: '复盘促销活动时区分自然增长与折扣带来的销量，避免高估活动的长期效果与利润表现。',
  },
  {
    id: 19,
    category: '库存',
    content: '给商品设置补货点时，应把生产、运输和入仓波动纳入计算，并定期校正参数。',
  },
  {
    id: 20,
    category: 'Listing',
    content: '主图负责快速传达商品价值，详情内容则应集中解答购买前最常见的疑虑和使用障碍。',
  },
  {
    id: 21,
    category: '售后',
    content: '售后回复先明确解决路径与预计步骤，减少反复沟通，也能降低用户的不确定感。',
  },
  {
    id: 22,
    category: '评价',
    content: '定期汇总评价中的高频词，把用户反复提到的优缺点反馈给产品和内容团队持续改进。',
  },
  {
    id: 23,
    category: '多平台',
    content: '进入新平台前先用少量商品验证运营流程，不要一次复制全部库存和投放策略。',
  },
  {
    id: 24,
    category: '备货',
    content: '旺季预测应准备保守、基准和积极三种情景，并为滞销风险保留调整空间和退出方案。',
  },
  {
    id: 25,
    category: '选品',
    content: '选品调研要关注用户为什么退货和抱怨，这些信息往往比销量排名更能揭示风险。',
  },
  {
    id: 26,
    category: '现金流',
    content: '核算商品利润时要计入广告、退货、仓储和汇率波动，避免把销售额当作真实收益。',
  },
  {
    id: 27,
    category: '转化',
    content: '优化价格时同步观察访客质量和竞品变化，短期转化提升不一定代表利润改善。',
  },
  {
    id: 28,
    category: '数据',
    content: '数据复盘先确认口径和时间范围一致，再比较渠道与商品，避免得出错误结论。',
  },
  {
    id: 29,
    category: '物流',
    content: '对丢件、破损和延误分别记录发生环节，才能针对包装、承运商或仓库持续改进。',
  },
  {
    id: 30,
    category: '备货',
    content: '旺季前提前确认供应商产能与关键物料，避免销量预测准确却因生产瓶颈错过窗口。',
  },
]

export const BUSINESS_TIPS_BATCH_COUNT = Math.ceil(BUSINESS_TIPS.length / BUSINESS_TIPS_PER_BATCH)

export const getBusinessTipsBatch = (batchIndex: number) => {
  const normalizedIndex = ((batchIndex % BUSINESS_TIPS_BATCH_COUNT) + BUSINESS_TIPS_BATCH_COUNT) % BUSINESS_TIPS_BATCH_COUNT
  const start = normalizedIndex * BUSINESS_TIPS_PER_BATCH
  return BUSINESS_TIPS.slice(start, start + BUSINESS_TIPS_PER_BATCH)
}
