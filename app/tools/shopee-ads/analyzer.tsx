'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import styles from './styles.module.css'
import { adviceSources, analyzeAds, buildStageGuidance, currencies, emptyInput, exampleInput, formatMetric, funnelGeometry, metricInfo, sites, summary } from '@/utils/shopee-ads'
import type { AdsInput, MetricKey } from '@/utils/shopee-ads'

const numericFields = [
  ['impressions', '曝光量', '例如 10000'], ['clicks', '点击量', '例如 200'],
  ['spend', '广告花费', '与销售额使用同一币种'], ['orders', '广告归因订单数', 'Orders，不是 Conversions'],
  ['sales', '广告归因销售额', '使用所选销售口径'],
] as const
const sourceLinks = [
  ['指标与归因定义', 'https://ads.shopee.sg/learn/faq/520/176', '区分订单、转化、商品件数和直接销售。'],
  ['Paid Sales 销售口径', 'https://ads.shopee.sg/learn/faq/525/2147', '付款后的取消、退货仍可能计入，不等于净收入。'],
  ['商品搜索广告优化', 'https://ads.shopee.sg/learn/faq/526/180', '按曝光、销售与利润目标检查商品及关键词；仅部分卖家可用。'],
  ['GMV Max 基本原理', 'https://ads.shopee.sg/learn/faq/519/1787', '自动竞价与目标 ROAS；目标不保证实现。'],
] as const

export default function AdsAnalyzer() {
  const [input, setInput] = useState<AdsInput>({ ...emptyInput })
  const [example, setExample] = useState(false)
  const [copied, setCopied] = useState('')
  const rowsRef = useRef<HTMLOListElement>(null)
  const [boundaries, setBoundaries] = useState([0, 240, 480, 720])
  useEffect(() => {
    const rows = rowsRef.current
    if (!rows)
      return
    const measure = () => {
      const heights = Array.from(rows.children).map(row => row.getBoundingClientRect().height)
      const next = heights.reduce<number[]>((edges, height) => [...edges, edges[edges.length - 1] + height], [0])
      if (next.length === 4 && next[3] > 0)
        setBoundaries(current => current.every((value, index) => Math.abs(value - next[index]) < 0.5) ? current : next)
    }
    const observer = new ResizeObserver(measure)
    Array.from(rows.children).forEach(row => observer.observe(row))
    measure()
    return () => observer.disconnect()
  }, [])
  const result = analyzeAds(input)
  const stages = buildStageGuidance(input, result)
  const valid = Object.keys(result.errors).length === 0
  const geometry = valid ? funnelGeometry([Number(input.impressions), Number(input.clicks), Number(input.orders)]) : []
  const set = (key: keyof AdsInput, value: string | boolean) => {
    setInput(current => ({ ...current, [key]: value }))
    setCopied('')
  }
  const loadExample = () => {
    setInput({ ...exampleInput })
    setExample(true)
    setCopied('')
  }
  const clear = () => {
    setInput({ ...emptyInput })
    setExample(false)
    setCopied('')
  }
  const field = (key: keyof AdsInput, label: string, placeholder: string, type = 'text') => <div className={styles.field} key={key}>
    <label htmlFor={key}>{label}</label>
    <input id={key} type={type} inputMode={type === 'text' ? 'decimal' : undefined}
      value={String(input[key])} onChange={event => set(key, event.target.value)} placeholder={placeholder}
      aria-invalid={!!result.errors[key]} aria-describedby={result.errors[key] ? `${key}-error` : undefined} />
    {result.errors[key] && <span id={`${key}-error`} className={styles.error}>{result.errors[key]}</span>}
  </div>
  const select = (key: keyof AdsInput, label: string, options: readonly (readonly [string, string])[]) => <div className={styles.field} key={key}>
    <label htmlFor={key}>{label}</label>
    <select id={key} value={String(input[key])} onChange={event => set(key, event.target.value)}
      aria-invalid={!!result.errors[key]} aria-describedby={result.errors[key] ? `${key}-error` : undefined}>
      <option value=''>请选择</option>
      {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
    </select>
    {result.errors[key] && <span id={`${key}-error`} className={styles.error}>{result.errors[key]}</span>}
  </div>
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary(input, result, example))
      setCopied('诊断摘要已复制')
    }
    catch { setCopied('复制未成功，请允许浏览器访问剪贴板，或手动选中诊断文字复制。') }
  }
  return <main className={`main-content ${styles.page}`} id='main-content' tabIndex={-1}>
    <Link href='/tools' className={styles.back}>← 经营工具</Link>
    <header className={styles.header}>
      <div><h1>Shopee 广告分析</h1>
        <p>从曝光到订单，找到下一步该检查什么。</p></div>
      <span className={styles.local}>本地计算 · 无需连接店铺</span>
    </header>
    <p className={styles.notice}>填写同一周期、同一币种的广告报表数据。数据仅保留在当前页面，刷新后清空；本页站点选择独立于顶部知识问答环境。</p>
    <div className={styles.layout}>
      <section className={styles.panel} aria-labelledby='input-heading'>
        <div className={styles.sectionHead}><h2 id='input-heading'>01 数据输入</h2><button type='button' onClick={loadExample}>填入示例</button></div>
        {example && <p className={styles.example}>当前包含演示数据，可继续修改；不代表真实商家或投放效果。</p>}
        <div className={styles.form}>
          {select('site', '站点 *', sites.map(value => [value, value]))}
          {select('currency', '币种 *', currencies.map(value => [value, value]))}
          {select('adType', '广告类型（匹配操作建议）', [['unknown', '暂不确定'], ['search', '商品搜索广告 · 手动投放'], ['gmvmax', 'GMV Max']])}
          {field('start', '统计开始日期 *', '', 'date')}
          {field('end', '统计结束日期 *', '', 'date')}
          {select('attribution', '数据归因方式 *', [['click', '点击归因'], ['view', '浏览归因'], ['mixed', '点击 + 浏览混合归因']])}
          {select('salesBasis', '订单与销售额口径 *', [['placed', 'Placed · 下单'], ['paid', 'Paid · 已支付'], ['confirmed', 'Confirmed · 已确认']])}
          {numericFields.map(([key, label, placeholder]) => field(key, `${label} *`, placeholder))}
        </div>
        <p className={styles.help}>归因窗口、商品范围与订单状态应一致。销售额可能含后续取消/退款，不能自动视为净收入；此页不推断各站点窗口。</p>
        <h3 className={styles.subheading}>补充经营目标 <span>选填</span></h3>
        <div className={styles.form}>
          {field('targetRoas', '目标 ROAS（倍）', '使用自己的目标')}
          {field('margin', '广告前贡献毛利率（%）', '如 25，而不是 0.25')}
          {field('conversions', '广告归因转化数', '仅填写报表的 Conversions')}
        </div>
        <label className={styles.checkbox}><input type='checkbox' checked={input.marginConfirmed} onChange={event => set('marginConfirmed', event.target.checked)} />
          <span>我确认毛利率已扣除货品、平台、物流等变动成本，未扣广告费，且与销售额使用一致口径。</span></label>
        <div className={styles.actions}><button type='button' onClick={clear}>清空 / 重置</button><span>修改后实时计算</span></div>
      </section>
      <div className={styles.output}>
        <section className={styles.panel} aria-labelledby='funnel-heading'>
          <div className={styles.sectionHead}><h2 id='funnel-heading'>02 广告漏斗与经营建议</h2><span>逐层看数据，逐项做验证</span></div>
          <p className={styles.funnelNote}>图形随输入实时变化：每段上沿宽度按数量平方根缩放（以最大阶段为 100%），下沿连接下一阶段宽度，末端收尖。非线性缩放便于看清小数量，面积不代表数量；真实比率以文字为准。订单多于点击时图形会扩宽，归因订单不等于独立用户。</p>
          <div className={styles.funnelHead}><span>广告表现</span><span>对应这一层的经营计划</span></div>
          <div className={styles.funnelBody}>
            <div className={styles.connectedFunnel} aria-hidden='true'>
              <svg viewBox={`0 0 100 ${boundaries[3]}`} preserveAspectRatio='none'>
                {geometry.map((shape, index) => {
                  const next = geometry[index + 1]?.width ?? 0
                  const top = boundaries[index]
                  const bottom = boundaries[index + 1]
                  return <polygon key={index} data-layer={index} points={`${50 - shape.width / 2},${top} ${50 + shape.width / 2},${top} ${50 + next / 2},${bottom} ${50 - next / 2},${bottom}`} />
                })}
                {boundaries.slice(1, 3).map((y, index) => <line key={index} x1='0' x2='100' y1={y} y2={y} vectorEffect='non-scaling-stroke' />)}
              </svg>
            </div>
            <ol className={styles.funnelRows} ref={rowsRef}>
              {stages.map((stage, index) => <li className={styles.funnelRow} key={stage.id} data-state={stage.state}>
                <article className={styles.stageAdvice} aria-labelledby={`stage-${stage.id}`}>
                  <div className={styles.stageMetrics}>
                    <span className={styles.stageName}>{String(index + 1).padStart(2, '0')} · {stage.label}</span>
                    <strong>{valid ? Number(input[stage.id]).toLocaleString('zh-CN') : '—'}</strong>
                    <span>{index === 0 ? '展示次数' : (index === 1 ? 'CTR ' : '订单点击比 ') + (valid ? formatMetric(index === 1 ? 'ctr' : 'orderClick', result.metrics[index === 1 ? 'ctr' : 'orderClick'], input.currency) : '—')}</span>
                  </div>
                  <div className={styles.adviceHeading}><h3 id={`stage-${stage.id}`}>{stage.title}</h3><span>{({ pending: '待补数据', check: '优先核查', maintain: '保持与验证', observe: '继续观察' })[stage.state]}</span></div>
                  <p className={styles.stageFact}>{stage.fact}</p>
                  <p className={styles.interpretation}>{stage.interpretation}</p>
                  <details className={styles.stagePlan}>
                    <summary>展开 3 步执行计划与复查指标</summary>
                    <ol className={styles.stageActions}>{stage.actions.map(action => <li key={action}>{action}</li>)}</ol>
                    <div className={styles.watch}><b>如何判断该保持还是调整</b><p>{stage.monitor}</p></div>
                  </details>
                  <details className={styles.evidence}>
                    <summary>查看官方依据与适用范围</summary>
                    <p>下列为新加坡站官方原则（核验：2026-10-10）。上方步骤是本工具结合输入制定的核查计划，不是已确认的原因；其他站点需核对当地功能。</p>
                    {stage.sources.map(id => <p key={id}><a href={adviceSources[id].url} target='_blank' rel='noreferrer'>{adviceSources[id].title} ↗</a>：{adviceSources[id].principle}</p>)}
                  </details>
                </article>
              </li>)}
            </ol>
          </div>
        </section>
        <section className={styles.panel} aria-labelledby='metrics-heading'>
          <div className={styles.sectionHead}><h2 id='metrics-heading'>03 核心指标</h2><span>{input.currency || '未选择币种'}</span></div>
          <dl className={styles.metrics}>
            {(Object.keys(metricInfo) as MetricKey[]).map(key => <div key={key}>
              <dt>{metricInfo[key][0]} <span className={styles.tooltipWrap}><button type='button' aria-label={`${metricInfo[key][0]}说明`} aria-describedby={`tip-${key}`}>?</button><span role='tooltip' id={`tip-${key}`}>{metricInfo[key][1]}</span></span></dt>
              <dd>{formatMetric(key, result.metrics[key], input.currency)}</dd>
              {result.metrics[key] === null && <small>{!valid ? '等待有效数据' : (key === 'cvr' && !input.conversions) ? '未提供转化数' : key === 'breakEven' ? '需有效毛利率并确认口径' : '分母为 0，无法计算'}</small>}
            </div>)}
          </dl>
        </section>
        <section className={styles.panel} aria-labelledby='diagnosis-heading'>
          <div className={styles.sectionHead}><h2 id='diagnosis-heading'>04 诊断与下一步</h2><button type='button' disabled={!valid} onClick={copy}>复制诊断摘要</button></div>
          <p role='status' className={styles.copyStatus}>{copied || (valid ? '按优先级排列；建议用于验证，不承诺提高 ROAS。' : '完成必填字段后查看诊断。')}</p>
          {result.findings.map((finding, index) => <article className={styles.finding} key={finding.id}>
            <h3><span>{String(index + 1).padStart(2, '0')}</span>{finding.title}</h3>
            <p><b>数据发现</b>{finding.discovery}</p><p><b>可能原因</b>{finding.reason}</p><p><b>下一步</b>{finding.action}</p>
            {finding.plan && <ol className={styles.stageActions}>{finding.plan.map(step => <li key={step.title}><b>{step.title}</b><p>{step.detail}</p></li>)}</ol>}
          </article>)}
        </section>
      </div>
    </div>
    <section className={styles.sources} aria-labelledby='sources-heading'>
      <h2 id='sources-heading'>相关广告知识与来源</h2>
      <p>以下规则来源适用于 Shopee 新加坡站，核验于 2026-10-10；其他站点请核对当地后台。公式可用于所选币种，本站不进行换汇。</p>
      <div>{sourceLinks.map(([title, url, description]) => <a key={url} href={url} target='_blank' rel='noreferrer'><strong>{title} ↗</strong><span>{description}</span></a>)}</div>
      <Link href='/'>返回知识助手，继续了解广告概念 →</Link>
    </section>
  </main>
}
