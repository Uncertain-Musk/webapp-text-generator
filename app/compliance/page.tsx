import React from 'react'
import SectionPage from '@/app/components/section-page'

export const metadata = { title: '规则与合规 · 越海 AI' }

export default function CompliancePage() {
  return <SectionPage title='规则与合规' description='了解平台要求，为商品发布做好准备。'
    emptyTitle='商品发布前合规检查' emptyDescription='发布前商品合规检查将在后续版本接入规则知识库。当前可通过知识助手咨询具体规则。'
    tasks={['rules', 'comparison']} />
}
