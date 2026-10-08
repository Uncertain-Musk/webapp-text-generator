import React from 'react'
import Link from 'next/link'
import { ArrowLeftIcon, ArrowUpRightIcon } from '@heroicons/react/24/outline'
import type { KnowledgeTaskId } from '@/config/tasks'
import { KNOWLEDGE_TASKS } from '@/config/tasks'

type SectionPageProps = {
  title: string
  description: string
  emptyTitle: string
  emptyDescription: string
  tasks: KnowledgeTaskId[]
}

export default function SectionPage({ title, description, emptyTitle, emptyDescription, tasks }: SectionPageProps) {
  return <main className='main-content section-page' id='main-content' tabIndex={-1}>
    <Link href='/' className='back-link'><ArrowLeftIcon aria-hidden='true' />返回首页</Link>
    <h1>{title}</h1><p className='section-description'>{description}</p>
    <section className='section-empty' aria-labelledby='empty-heading'>
      <span className='availability-label'>后续版本开放</span>
      <h2 id='empty-heading'>{emptyTitle}</h2><p>{emptyDescription}</p>
    </section>
    <section className='available-questions' aria-labelledby='available-heading'>
      <h2 id='available-heading'>现在可以先问越海 AI</h2>
      <p>基于跨境电商知识库，了解相关规则与经营信息。</p>
      {KNOWLEDGE_TASKS.filter(task => tasks.includes(task.id)).map(task => <Link key={task.id} href={`/?task=${task.id}#ask`} className='question-link'><span>{task.example}</span><ArrowUpRightIcon aria-hidden='true' /></Link>)}
      {tasks.length === 0 && <Link href='/#ask' className='question-link'><span>了解 ACOS、ROAS 与利润核算的基本概念</span><ArrowUpRightIcon aria-hidden='true' /></Link>}
    </section>
  </main>
}
