import React from 'react'
import SectionPage from '@/app/components/section-page'

export const metadata = { title: '问题处理 · 越海 AI' }

export default function IssuesPage() {
  return <SectionPage title='问题处理' description='围绕违规、退款与售后，梳理处理思路。'
    emptyTitle='专项问题处理流程' emptyDescription='分步骤的问题处理指引将在后续版本提供。目前可向知识助手描述具体情况，了解规则与处理建议。'
    tasks={['violations', 'refunds']} />
}
