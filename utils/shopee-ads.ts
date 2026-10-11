export const sites = ['新加坡', '马来西亚', '泰国', '越南', '菲律宾', '印度尼西亚', '中国台湾', '巴西'] as const
export const currencies = ['SGD', 'MYR', 'THB', 'VND', 'PHP', 'IDR', 'TWD', 'BRL', 'USD', 'CNY'] as const
export type AdsInput = {
  adType?: string
  site: string
  currency: string
  start: string
  end: string
  attribution: string
  salesBasis: string
  impressions: string
  clicks: string
  spend: string
  orders: string
  sales: string
  targetRoas: string
  margin: string
  conversions: string
  marginConfirmed: boolean
}
export const emptyInput: AdsInput = {
  adType: 'unknown',
  site: '',
  currency: '',
  start: '',
  end: '',
  attribution: '',
  salesBasis: '',
  impressions: '',
  clicks: '',
  spend: '',
  orders: '',
  sales: '',
  targetRoas: '',
  margin: '',
  conversions: '',
  marginConfirmed: false,
}
export const exampleInput: AdsInput = {
  adType: 'search',
  site: '新加坡',
  currency: 'SGD',
  start: '2026-09-01',
  end: '2026-09-30',
  attribution: 'click',
  salesBasis: 'paid',
  impressions: '10000',
  clicks: '200',
  spend: '100',
  orders: '10',
  sales: '500',
  targetRoas: '4',
  margin: '25',
  conversions: '',
  marginConfirmed: true,
}
export const metricInfo = {
  ctr: ['CTR', '点击量 ÷ 曝光量 × 100%；不是独立用户点击率。'],
  cpc: ['CPC', '广告花费 ÷ 点击量；每次点击的平均广告成本。'],
  cpm: ['CPM', '广告花费 ÷ 曝光量 × 1000；等效千次曝光成本，不代表平台按曝光收费。'],
  roas: ['ROAS', '广告归因销售额 ÷ 广告花费；销售回报倍数，不是利润率。'],
  acos: ['ACOS', '广告花费 ÷ 广告归因销售额 × 100%；销售口径必须一致。'],
  costPerOrder: ['每订单广告成本', '广告花费 ÷ 广告归因订单数；不是每转化成本。'],
  orderClick: ['订单点击比', '广告归因订单数 ÷ 点击量 × 100%；可超过 100%，不等同于 CVR。'],
  cvr: ['CVR', '广告归因转化数 ÷ 点击量 × 100%；仅在提供 Conversions 时计算，不用订单数替代。'],
  breakEven: ['估算保本 ROAS', '1 ÷ 广告前贡献毛利率。须已扣除货品、平台、物流等变动成本，未扣广告；同销售额口径，仅为估算，不含固定成本与增量归因验证。'],
} as const
export type MetricKey = keyof typeof metricInfo
export type Finding = { id: string; priority: number; title: string; discovery: string; reason: string; action: string; plan?: { title: string; detail: string }[] }
export type Analysis = { metrics: Record<MetricKey, number | null>; errors: Partial<Record<keyof AdsInput, string>>; warnings: string[]; findings: Finding[] }
const labels: Record<string, string> = { impressions: '曝光量', clicks: '点击量', spend: '广告花费', orders: '广告归因订单数', sales: '广告归因销售额', targetRoas: '目标 ROAS', margin: '贡献毛利率', conversions: '广告归因转化数' }
export function analyzeAds(input: AdsInput): Analysis {
  const errors: Analysis['errors'] = {}
  const warnings: string[] = []
  const values: Record<string, number | null> = {}
  const optional = ['targetRoas', 'margin', 'conversions']
  for (const key of Object.keys(labels)) {
    const raw = String(input[key as keyof AdsInput]).trim()
    if (!raw) {
      values[key] = null
      if (!optional.includes(key))
        errors[key as keyof AdsInput] = `请填写${labels[key]}`
      continue
    }
    const value = Number(raw)
    if (!/^\d+(\.\d+)?$/.test(raw) || !Number.isFinite(value) || value > Number.MAX_SAFE_INTEGER
      || (['impressions', 'clicks', 'orders', 'conversions'].includes(key) && !Number.isSafeInteger(value))
      || (['targetRoas', 'margin'].includes(key) && value <= 0) || (key === 'margin' && value > 100)) {
      errors[key as keyof AdsInput] = `${labels[key]}格式或范围无效；数量须为非负整数，目标大于 0，毛利率在 (0, 100] 内`
      values[key] = null
    }
    else { values[key] = value }
  }
  if (!(sites as readonly string[]).includes(input.site))
    errors.site = '请选择站点'
  if (!(currencies as readonly string[]).includes(input.currency))
    errors.currency = '请选择币种；所有金额须使用同一币种'
  for (const key of ['start', 'end'] as const) {
    const date = new Date(`${input[key]}T00:00:00Z`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input[key]) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== input[key])
      errors[key] = '请填写有效日期'
  }
  if (!errors.start && !errors.end && input.end < input.start)
    errors.end = '结束日期不能早于开始日期'
  if (!['click', 'view', 'mixed'].includes(input.attribution))
    errors.attribution = '请选择报表实际采用的归因方式'
  if (!['placed', 'paid', 'confirmed'].includes(input.salesBasis))
    errors.salesBasis = '请选择一致的订单与销售额口径'
  if (values.clicks !== null && values.impressions !== null && values.clicks > values.impressions)
    errors.clicks = '点击量大于曝光量，请核对周期与报表口径'
  if (values.orders !== null && values.clicks !== null && values.orders > values.clicks)
    warnings.push(input.attribution === 'click' ? '订单数大于点击量：请核对跨商品、重复购买与归因窗口，不能把订单点击比解释为独立用户转化率。' : '订单数大于点击量：浏览或混合归因可包含未点击订单；阶段比率不是独立用户转化率。')
  if (values.margin !== null && !input.marginConfirmed)
    warnings.push('请确认贡献毛利率的成本与销售额口径，确认前不计算保本 ROAS。')
  if (values.orders === 0 && (values.sales ?? 0) > 0)
    warnings.push('订单为 0 但销售额大于 0，请核对归因周期与报表数据。')
  const ratio = (a: number | null, b: number | null, scale = 1, field: keyof AdsInput = 'spend') => {
    if (a === null || b === null || b === 0)
      return null
    const result = a / b * scale
    if (!Number.isFinite(result) || (result === 0 && a > 0)) {
      errors[field] = '数值比例超出可计算范围，请核对金额单位与小数位'
      return null
    }
    return result
  }
  const { impressions, clicks, spend, orders, sales, conversions, margin } = values
  const metrics: Analysis['metrics'] = {
    ctr: ratio(clicks, impressions, 100),
    cpc: ratio(spend, clicks),
    cpm: ratio(spend, impressions, 1000),
    roas: ratio(sales, spend),
    acos: ratio(spend, sales, 100),
    costPerOrder: ratio(spend, orders),
    orderClick: ratio(orders, clicks, 100),
    cvr: ratio(conversions, clicks, 100),
    breakEven: input.marginConfirmed ? ratio(100, margin, 1, 'margin') : null,
  }
  const findings: Finding[] = []
  const add = (id: string, priority: number, title: string, discovery: string, reason: string, action: string) => findings.push({ id, priority, title, discovery, reason, action })
  if (Object.keys(errors).length) {
    for (const key of Object.keys(metrics) as MetricKey[]) metrics[key] = null
    add('invalid', 0, '先补齐并核对数据', '必填字段缺失或数据异常，暂不输出经营判断。', '不同周期、币种或报表字段可能被混用。', '修正标记字段，并从同一报表重新核对数据。')
  }
  else {
    if (warnings.length)
      add('attribution', 1, '先核对归因口径', warnings.join(' '), '归因包含范围可能不同于点击事件范围。', '检查报表归因窗口、订单状态和商品范围，再比较指标。')
    const belowBreakEven = metrics.roas !== null && metrics.breakEven !== null && metrics.roas < metrics.breakEven
    if (belowBreakEven)
      add('below-breakeven', 2, '低于估算保本水平', '当前 ROAS 低于按贡献毛利率估算的保本 ROAS。', '广告成本可能超过同口径销售的广告前贡献；退款与归因销售也会影响判断。', '先复核成本、退款与销售口径，设定可承受损失额度，再逐项检查商品与投放。')
    if (impressions! > 0 && clicks === 0)
      add('no-clicks', 3, '有曝光，尚无点击', '本周期存在曝光，但点击量为 0。', '素材、价格或流量相关性可能影响点击，也可能是观察期较短。', '核对曝光时间，检查主图、标题与搜索词；一次调整一个变量，并与自身历史数据比较。')
    if (clicks! > 0 && orders === 0)
      add('no-orders', 3, '有点击，尚无归因订单', '本周期有点击，没有记录到广告归因订单。', '详情页、库存、运费或归因回传延迟均可能相关。', '先等归因窗口完整，再检查商品页、库存、运费与支付路径；不要仅凭本期结果扩大预算。')
    if (values.targetRoas !== null && metrics.roas !== null) {
      if (metrics.roas < values.targetRoas) {
        add('below-target', 4, '低于你的 ROAS 目标', '当前 ROAS 低于自行设置的目标。', '花费结构、商品组合或目标与历史表现不匹配均有可能。', '按商品与广告拆分同口径数据，优先复核花费较多的条目；每次只测试一项调整。')
      }
      else if (!belowBreakEven && !warnings.length && orders! > 0) {
        const fmt = (value: number) => new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(value)
        const money = (value: number) => `${input.currency} ${fmt(value)}`
        const guard = Math.max(values.targetRoas, metrics.breakEven ?? 0)
        const relative = (metrics.roas / values.targetRoas - 1) * 100
        add('target-met', 5, '已达目标：先保住有效投放，再验证能否扩量',
          `本期 ROAS ${fmt(metrics.roas)}×，目标 ${fmt(values.targetRoas)}×，高出目标 ${fmt(relative)}%。花费 ${money(spend!)} 带来 ${orders} 笔归因订单、销售额 ${money(sales!)}。${metrics.breakEven !== null ? `估算保本线 ${fmt(metrics.breakEven)}×，ROAS 高出保本线 ${fmt(metrics.roas - metrics.breakEven)}×；这不是净利润。` : '贡献毛利率未核实，暂不能判断是否保本。'}`,
          `只有本期汇总和 ${orders} 笔订单，尚不知道销售是否集中在个别大单或商品，也没有历史趋势可验证稳定性。先拆分商品和广告，避免把某个赢家的表现当成全店都有效。`,
          '按下列顺序执行：先核对订单质量，再保留有效投放，最后只测试一个变量并按相同口径复查。')
        findings[findings.length - 1].plan = [
          { title: '先确认：这批订单能否支撑达标判断', detail: `导出 ${input.start} 至 ${input.end} 的商品/广告明细，逐项列出花费、订单、销售额、ROAS；检查销售是否集中在单个商品或大单，核对取消、退款及缺货订单。等待后台实际归因窗口完整，再与同口径、同长度历史周期比较；没有历史时先保存本期作基线。` },
          { title: '保持：保护已经有效的商品和设置', detail: `保留已核实达标商品的主图、价格与投放设置，检查可售库存、发货时效和促销到期日。不要因汇总达标就给所有商品加预算。${input.adType === 'gmvmax' ? 'GMV Max 若仍处学习期，避免无必要修改目标与设置；先查看后台学习状态。' : input.adType === 'search' ? '手动搜索广告按商品与关键词分开复核，保留已有订单且成本符合目标的条目，暂不同时改出价和匹配方式。' : '先确认广告类型；手动搜索与 GMV Max 的操作方式不同。'}` },
          { title: '测试：写清一个变量、预算和复查时间', detail: '只选一个已核实达标且库存充足的商品，记录原设置；从主图、流量覆盖或预算中只选一项测试，其他条件尽量保持一致。开始前自行填写可承受的测试花费上限和结束日期；本页没有日级数据及库存信息，不能替你给出可靠加预算金额。测试至少覆盖后台实际归因窗口；固定日期复查，避免每天因波动反复改动。' },
          { title: '复查：什么情况下保持，什么情况下收缩', detail: `用相同销售口径复查：ROAS 不低于 ${fmt(guard)}× 且订单质量、库存与履约没有恶化，才考虑保留测试；完整归因后低于该线，停止新增预算，回到原设置并检查商品/流量结构。达到自行设定的花费上限或出现缺货、履约问题时，不等待归因结束也应停止本次扩量。若销售额固定为本期 ${money(sales!)}，满足该线的总花费参考为 ${money(sales! / guard)}（销售额 ÷ ${fmt(guard)}）；这是静态核算，不是新增预算，也不预测未来回报。` },
        ]
      }
    }
    if (impressions === 0 || clicks === 0 || spend === 0 || orders === 0)
      add('insufficient', 6, '数据不足以判断稳定表现', '零曝光、零点击、零花费或尚无订单，使部分指标无法解释。', '当前数据缺少有效分母或成交观察；本工具没有预设行业样本阈值。', '补全一个归因窗口，与自身多个同口径周期比较；即使有订单，也不能据此认定样本充分。')
    if (!findings.length)
      add('observe', 7, '建立自己的比较基准', '已完成计算；没有设置目标或触发当前规则。', '单期汇总数据不能区分商品结构与流量变化，也不能判断统计稳定性。', '填写自身目标与可核实的贡献毛利率，结合历史同口径周期复核，不套用统一行业阈值。')
  }
  return { metrics, errors, warnings, findings: findings.sort((a, b) => a.priority - b.priority) }
}
export function formatMetric(key: MetricKey, value: number | null, currency: string): string {
  if (value === null)
    return '—'
  const number = (value > 0 && value < 0.0001) ? value.toExponential(3) : new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 4 }).format(value)
  if (['ctr', 'acos', 'orderClick', 'cvr'].includes(key))
    return `${number}%`
  if (['cpc', 'cpm', 'costPerOrder'].includes(key))
    return `${currency} ${number}`
  return `${number}×`
}
export const adviceSources = {
  optimization: { title: '搜索广告优化', url: 'https://ads.shopee.sg/learn/faq/526/180', principle: '分别按曝光、销售和利润目标检查商品与关键词表现；该广告类型仅部分卖家可用。' },
  selection: { title: '选品与匹配方式', url: 'https://ads.shopee.sg/learn/faq/526/187', principle: '选品要对应经营目标；广泛匹配与精准匹配覆盖的搜索范围不同。' },
  gmvmax: { title: 'GMV Max 官方指南', url: 'https://ads.shopee.sg/learn/faq/519/1787', principle: '目标应参考历史表现；学习期避免无必要修改，目标 ROAS 不保证达成。' },
  sales: { title: '销售额口径说明', url: 'https://ads.shopee.sg/learn/faq/525/2147', principle: '跨期比较不能混用 Placed 与 Paid；付款后取消或退货仍可能计入 Paid Sales。' },
} as const

export function summary(input: AdsInput, result: Analysis, isExample = false): string {
  const attribution = { click: '点击归因', view: '浏览归因', mixed: '混合归因' }[input.attribution]
  const basis = { placed: '下单', paid: '已支付', confirmed: '已确认' }[input.salesBasis]
  return ['Shopee 广告分析（本地规则诊断）', isExample ? '包含演示数据或其修改，不代表真实商家或投放效果。' : '用户手动填写，未核实原始广告报表。', `${input.site} / ${input.currency} / ${input.start} 至 ${input.end}`,
    `归因：${attribution}；订单与销售：${basis}`,
    ...Object.keys(labels).map(key => `${labels[key]}：${input[key as keyof AdsInput] || '未提供'}`),
    ...Object.entries(result.metrics).map(([key, value]) => `${metricInfo[key as MetricKey][0]}：${formatMetric(key as MetricKey, value, input.currency)}`),
    ...result.findings.map(f => `${f.title}\n数据发现：${f.discovery}\n可能原因：${f.reason}\n下一步：${f.action}${f.plan ? `\n${f.plan.map(p => `${p.title}：${p.detail}`).join('\n')}` : ''}`),
    ...buildStageGuidance(input, result).map(stage => [`${stage.label}：${stage.title}`, stage.fact, stage.interpretation, ...stage.actions.map((action, i) => `${i + 1}. ${action}`), `复查：${stage.monitor}`, ...stage.sources.map(id => `${adviceSources[id].title} ${adviceSources[id].url}`)].join('\n')),
    '归因不是独立用户漏斗；结果不是增量或利润保证。数据由用户填写，未上传服务器。'].join('\n')
}

export type StageGuidance = {
  id: 'impressions' | 'clicks' | 'orders'
  label: string
  state: 'pending' | 'check' | 'maintain' | 'observe'
  title: string
  fact: string
  interpretation: string
  actions: string[]
  monitor: string
  sources: (keyof typeof adviceSources)[]
}

/** Local decision rules. Official principles and our operational checks are labelled separately in the UI. */
export function buildStageGuidance(input: AdsInput, result: Analysis): StageGuidance[] {
  const definitions = [['impressions', '曝光'], ['clicks', '点击'], ['orders', '广告归因订单']] as const
  if (Object.keys(result.errors).length) {
    return definitions.map(([id, label]) => ({
      id,
      label,
      state: 'pending',
      title: '等待完整、有效的数据',
      fact: '当前仍有必填缺失或异常，不能据此判断这一层的表现。',
      interpretation: '请使用同一站点、币种、统计周期与归因口径的报表。填入示例可先体验，示例不代表真实经营情况。',
      actions: ['补齐标记字段，区分没有数据与实际数值为零。', '从原报表确认 Orders、Conversions 与销售额字段，避免错列。', '选择实际广告类型，以便区分手动搜索广告和 GMV Max 的可执行操作。'],
      monitor: '修正后重新计算；本页不会上传输入，也不会自动调整广告账户。',
      sources: ['sales'],
    }))
  }
  const { metrics: m } = result
  const n = (value: string) => Number(value).toLocaleString('zh-CN')
  const metric = (key: MetricKey) => formatMetric(key, m[key], input.currency)
  const orders = Number(input.orders)
  const clicks = Number(input.clicks)
  const impressions = Number(input.impressions)
  const spend = Number(input.spend)
  const goal = input.targetRoas ? Number(input.targetRoas) : null
  const met = result.findings.some(f => f.id === 'target-met')
  const belowBreakEven = result.findings.some(f => f.id === 'below-breakeven')
  const manual = input.adType === 'search'
  const auto = input.adType === 'gmvmax'
  const typeSource: keyof typeof adviceSources = auto ? 'gmvmax' : 'selection'
  const limit = Math.max(goal ?? 0, m.breakEven ?? 0)
  const costReference = (denominator: number, key: 'cpc' | 'costPerOrder') => {
    const value = Number(input.sales) / denominator / limit
    return (Number.isFinite(value) && value > 0) ? formatMetric(key, value, input.currency) : null
  }
  const cpcLimit = (limit > 0 && clicks > 0 && input.attribution === 'click' && !result.warnings.length) ? costReference(clicks, 'cpc') : null
  const orderLimit = (limit > 0 && orders > 0 && !result.warnings.length) ? costReference(orders, 'costPerOrder') : null
  const threshold = [goal ? `你的目标 ${formatMetric('roas', goal, input.currency)}` : '', m.breakEven !== null ? `估算保本线 ${metric('breakEven')}` : ''].filter(Boolean).join('、')
  const watchReturn = threshold
    ? `按完整归因窗口复查 ROAS、取消/退款与商品结构；若持续低于${threshold}，先收缩本次测试，核对原因后再决定预算。`
    : '补充自己的 ROAS 目标与经核实的贡献毛利率；用相同口径的历史周期比较，不能仅凭一次出单认定投放有效。'
  const exposure: StageGuidance = {
    id: 'impressions',
    label: '曝光',
    state: impressions === 0 ? 'check' : met ? 'maintain' : 'observe',
    title: impressions === 0 ? '先排查为什么没有曝光' : met ? '整体达标，先保留有效投放结构' : '已有曝光，先看流量分布',
    fact: `本周期曝光 ${n(input.impressions)} 次，点击 ${n(input.clicks)} 次，等效 CPM ${metric('cpm')}。`,
    interpretation: impressions === 0 ? '零曝光不能直接归因于出价低。广告状态、投放时间、余额、商品资格与目标设置都需要在后台逐项核对。' : '曝光量只说明展示规模。没有历史基线、展示位置和商品明细，不能判断流量已经足够或质量优于同行。',
    actions: [
      impressions === 0 ? '先看广告是否启用、是否在投放时段、余额及预算是否可用；再检查商品是否在售、是否有库存或审核限制。' : '导出商品与广告明细，记录曝光、花费和归因销售的分布；识别预算集中项，避免平均值掩盖单个商品的消耗。',
      auto
        ? 'GMV Max 先确认是否处于学习期、ROAS 目标是否偏离商品历史；学习期避免同时修改目标、商品与预算。'
        : manual
          ? '搜索广告按商品和关键词检查相关性；保留与商品明确相关的词。需要拓展时另建有限预算的匹配测试，避免一次扩大所有词。'
          : '先确认广告类型：手动搜索广告可检查关键词匹配；GMV Max 应检查目标与学习状态，不套用手动关键词操作。',
      met
        ? '保留经明细确认表现稳定的商品与投放设置，优先保证库存、商品可售与页面内容稳定；新商品或新流量单独分配可承受的测试预算。'
        : '确定本次只解决一个问题，例如恢复曝光或验证流量相关性；记录改动前的同周期数据，不因曝光少就直接提高全部预算。',
    ],
    monitor: '查看曝光与花费是否同步变化，再看点击、订单和 ROAS 是否跟随；CPM 仅为等效成本，不代表平台按曝光收费。活动日与日常周期分开比较。',
    sources: [typeSource, 'optimization'],
  }
  const click: StageGuidance = {
    id: 'clicks',
    label: '点击',
    state: clicks === 0 ? 'check' : met ? 'maintain' : 'observe',
    title: clicks === 0 ? (impressions > 0 ? '展示后未产生点击，先检查吸引力与相关性' : '先恢复曝光，再观察点击') : met ? '保留有效素材，同时守住点击成本' : '有点击，继续核查点击质量与成本',
    fact: `点击 ${n(input.clicks)} 次；CTR ${metric('ctr')}，平均 CPC ${metric('cpc')}。`,
    interpretation: `CTR 没有适用于全部商品的统一合格线；应与自己的同商品、同活动条件历史比较。${cpcLimit ? `按本期销售/点击及目标与保本线中较高者折算，CPC 参考边界为 ${cpcLimit}；它是静态测算，不是平台出价上限或未来预测。` : '浏览/混合归因、缺少目标或存在口径疑点时，不推算点击成本边界。'}`,
    actions: [
      '在买家实际看到的商品页核对主图是否准确展示核心卖点，标题是否与商品和搜索意图一致；同时检查售价与运费表达，避免点击后发现信息不一致。',
      manual
        ? '按关键词拆分 CTR、CPC 与归因销售；不要只因为点击便宜就加价。对相关性存疑的词先检查匹配范围，再做独立的小范围调整。'
        : auto
          ? 'GMV Max 不按手动关键词方案改价。先核对商品素材、历史目标和学习状态，把素材调整与目标/预算调整错开并留记录。'
          : '选择实际广告类型后再决定操作入口；可先按商品拆分点击与花费，定位需要检查的条目，不把所有广告一起调整。',
      met
        ? '从明细中找出持续带来同口径订单的素材与商品作为保留组；新主图或文案单独测试，期间尽量保持价格、促销和其他条件一致。'
        : '每轮只测试一项主要变化，例如主图或匹配范围；保留原版本与改动日期，避免把多项同时变化后的结果归因于某一个动作。',
    ],
    monitor: '同时记录 CTR、CPC、订单点击比与 ROAS。若 CTR 上升但订单/ROAS 变差，先核查流量是否偏离购买意图；不能仅为提高 CTR 接受失去销售贡献的点击。',
    sources: ['optimization', typeSource],
  }
  const order: StageGuidance = {
    id: 'orders',
    label: '广告归因订单',
    state: 'observe',
    title: '已有订单，先建立利润与目标基准',
    fact: `归因订单 ${n(input.orders)} 笔，订单点击比 ${metric('orderClick')}；ROAS ${metric('roas')}，每订单广告成本 ${metric('costPerOrder')}。`,
    interpretation: `订单点击比不是 CVR，归因销售也不等于广告增量或净收入。${orderLimit ? `按本期客单价与目标/保本约束折算，每订单广告成本参考边界为 ${orderLimit}；商品组合与客单价变化后要重算。` : '当前不具备可靠的每订单成本参考边界，请先补充目标或核对口径。'}`,
    actions: [
      '先统一统计周期、商品范围与订单状态；将 Placed、Paid、Confirmed 分开比较，核对付款后取消/退款，等待当前归因窗口回传完整。',
      '把广告拆到商品层，结合货品、平台、物流等变动成本逐项核对贡献毛利；优先检查花费高却没有相应销售贡献的条目，不用总体 ROAS 掩盖单品问题。',
      '制定下一轮观察计划：记录保留项、唯一改动、可承受预算、复查时间和停止条件；预算金额由自身现金流与风险承受能力确定。',
    ],
    monitor: watchReturn,
    sources: ['sales', 'optimization'],
  }
  if (result.warnings.length) {
    order.state = 'check'
    order.title = '先核对口径，再判断订单效果'
    order.interpretation = `${result.warnings.join(' ')} 在疑点消除前，不把当前 ROAS 当作扩量依据。`
  }
  else if (orders === 0) {
    order.state = 'check'
    order.title = '尚没有归因订单，优先排查成交环节'
    order.actions[1] = '有点击时，从买家视角检查详情承诺、规格、库存、送达时间、运费和支付可用性；这些是核查项，汇总数据不能证明其中哪一项导致未成交。'
    order.actions[2] = '先核对归因回传与商品页，再决定是否继续测试；预设可承受的试投损失，不通过反复加预算等待偶然成交。'
  }
  else if (spend === 0) {
    order.state = 'check'
    order.title = '先核对零花费，暂不判断投入回报'
    order.interpretation = '存在订单但花费为零，ROAS 无法计算。请检查费用回传与统计口径，不能据此认定是免费获客或高回报。'
  }
  else if (belowBreakEven) {
    order.state = 'check'
    order.title = '低于估算保本线，先控制损失'
    order.actions[2] = '复核毛利口径后，优先收缩或暂停经明细确认持续低于保本的测试条目，保留对照记录；先验证商品与成本问题，再谈扩大花费。'
  }
  else if (met) {
    order.state = 'maintain'
    order.title = m.breakEven === null ? '本期目标达标，利润仍需核实' : '本期目标达标，先稳住再测试'
    order.actions[1] = '保持已验证的商品供货、价格与履约稳定，复查取消/退款是否侵蚀回报；把新增测试预算与现有有效投放分开记账，避免打乱保留组。'
    order.actions[2] = auto
      ? 'GMV Max 学习期内先减少无必要编辑；准备扩量时，只调整一个可控变量，保留原设置与回退条件，观察完整归因后的 ROAS 与贡献毛利。'
      : '需要拓展时，只选一个商品或一组相关流量做有限预算测试；同时保留原设置作为对照。增量订单、成本和退款一起看，不把原有订单重复记为新增效果。'
  }
  else if (goal !== null && m.roas !== null && m.roas < goal) {
    order.state = 'check'
    order.title = '低于自设目标，先拆分低效条目'
    order.actions[2] = '按同口径商品明细复核低于目标的花费集中项；分别检查商品利润与投放相关性，一次只调整一项。不要把目标设低当作效果已改善。'
  }
  if (auto && !order.sources.includes('gmvmax'))
    order.sources.push('gmvmax')
  return [exposure, click, order]
}

/** Top widths encode sqrt(count / max); lower edges connect to the next stage. */
export function funnelGeometry(counts: number[]): { width: number; points: string }[] {
  if (counts.length !== 3 || counts.some(value => !Number.isFinite(value) || value < 0))
    return []
  const max = Math.max(...counts)
  const widths = counts.map(value => max === 0 ? 0 : Math.sqrt(value / max) * 100)
  return widths.map((width, index) => {
    const next = widths[index + 1] ?? 0
    return { width, points: `${50 - width / 2},0 ${50 + width / 2},0 ${50 + next / 2},100 ${50 - next / 2},100` }
  })
}
