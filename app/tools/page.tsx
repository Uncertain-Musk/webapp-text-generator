import React from 'react'
import SectionPage from '@/app/components/section-page'

export const metadata = { title: '经营工具 · 越海 AI' }

export default function ToolsPage() {
  return <SectionPage title='经营工具' description='帮助你理解广告指标与经营成本。'
    emptyTitle='ACOS、ROAS 与利润计算' emptyDescription='计算工具将在公式与成本口径验证后开放。当前可向知识助手了解指标含义与核算方法，尚不提供计算结果或店铺数据分析。'
    tasks={[]} />
}
