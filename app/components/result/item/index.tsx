'use client'
import type { FC } from 'react'
import React, { useEffect, useState } from 'react'
import copy from 'copy-to-clipboard'
import { ArrowPathIcon, CheckIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline'
import { Markdown } from '@/app/components/base/markdown'
import type { Feedbacktype, WorkflowProcess } from '@/types/app'

export type IGenerationItemProps = {
  isWorkflow?: boolean
  workflowProcessData?: WorkflowProcess
  className?: string
  isError: boolean
  onRetry: () => void
  content: any
  messageId?: string | null
  isLoading?: boolean
  isResponding?: boolean
  isInWebApp?: boolean
  depth?: number
  feedback?: Feedbacktype
  onFeedback?: (feedback: Feedbacktype) => void
  isMobile?: boolean
  taskId?: string
}

const GenerationItem: FC<IGenerationItemProps> = ({ content, messageId, isError, onRetry, isResponding }) => {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    setCopied(false)
  }, [content])
  useEffect(() => {
    if (!copied)
      return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])
  const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2)
  if (isError)
    return <div className='answer-error' role='alert'><p>本次分析未完成，请稍后重试。</p><button className='retry-button' type='button' onClick={onRetry}><ArrowPathIcon aria-hidden='true' />重新分析</button></div>
  return (
    <article>
      {typeof content === 'string' ? <Markdown content={content} /> : <pre className='structured-output'>{text}</pre>}
      <div className='answer-actions'>
        <button className='copy-button' type='button' disabled={!messageId || isResponding}
          onClick={() => {
            if (copy(text))
              setCopied(true)
          }} aria-live='polite'>
          {copied ? <CheckIcon aria-hidden='true' /> : <ClipboardDocumentIcon aria-hidden='true' />}{copied ? '已复制' : '复制回答'}
        </button>
        <span>{isResponding ? '回答正在生成…' : '结合实际业务情况参考'}</span>
      </div>
    </article>
  )
}
export default React.memo(GenerationItem)
