import React from 'react'
import Link from 'next/link'

export const metadata = { title: '经营工具 · 越海 AI' }

export default function ToolsPage() {
  return <main className='main-content section-page' id='main-content' tabIndex={-1}>
    <Link href='/'>← 返回知识助手</Link>
    <h1>经营工具</h1>
    <p>用自己的报表与经营目标，理解广告表现。</p>
    <section className='answer-panel' style={{ marginTop: 28 }}>
      <h2>Shopee 广告分析</h2>
      <p style={{ margin: '16px 0 24px', lineHeight: 1.8 }}>手动填写广告数据，实时计算 CTR、ROAS、ACOS 与估算保本水平，查看规则诊断与优化建议。数据只在浏览器本地计算，无需连接广告账户。</p>
      <Link href='/tools/shopee-ads' className='submit-button'>开始分析 →</Link>
    </section>
  </main>
}
