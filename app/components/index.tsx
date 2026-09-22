'use client'
import React, { useEffect, useRef, useState } from 'react'
import { ArrowPathIcon, ArrowUpRightIcon } from '@heroicons/react/24/outline'
import RunOnce from './run-once'
import Result from './result'
import BusinessTips from './business-tips'
import { APP_INFO, IS_WORKFLOW } from '@/config'
import { fetchAppParams } from '@/service'
import { userInputsFormToPromptVariables } from '@/utils/prompt'
import { changeLanguage } from '@/i18n/i18next-config'
import type { PromptConfig, VisionFile, VisionSettings } from '@/types/app'
import { Resolution, TransferMethod } from '@/types/app'

const questions = [
  { topic: '库存管理', text: 'Amazon FBA 库存积压应该怎么处理？' },
  { topic: '广告投放', text: 'ACOS 持续上升可能有哪些原因？' },
  { topic: '平台比较', text: 'Temu 和 Amazon 的履约模式有什么区别？' },
  { topic: '税务合规', text: '欧洲站 VAT 有哪些常见风险？' },
]

export default function TextGeneration({ isConfigured }: { isConfigured: boolean }) {
  const [inputs, setInputs] = useState<Record<string, any>>({})
  const [promptConfig, setPromptConfig] = useState<PromptConfig | null>(null)
  const [appError, setAppError] = useState('')
  const [reload, setReload] = useState(0)
  const [controlSend, setControlSend] = useState(0)
  const [isBusy, setIsBusy] = useState(false)
  const [completionFiles, setCompletionFiles] = useState<VisionFile[]>([])
  const [visionConfig, setVisionConfig] = useState<VisionSettings>({
    enabled: false,
    number_limits: 2,
    detail: Resolution.low,
    transfer_methods: [TransferMethod.local_file],
  })
  const composerRef = useRef<HTMLDivElement>(null)
  const answerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    let active = true
    changeLanguage(APP_INFO.default_language)
    setAppError('')
    if (!isConfigured) {
      setAppError('服务暂未就绪，请稍后再试。')
      return
    }
    (async () => {
      try {
        const parameters: any = await fetchAppParams()
        if (!Array.isArray(parameters.user_input_form))
          throw new Error('Application parameters unavailable')
        if (!active)
          return
        const prompt_variables = userInputsFormToPromptVariables(parameters.user_input_form)
        setPromptConfig({ prompt_template: '', prompt_variables })
        setVisionConfig(current => ({
          ...current,
          ...parameters.file_upload?.image,
          image_file_size_limit: parameters.system_parameters?.image_file_size_limit || 0,
        }))
      }
      catch {
        if (active)
          setAppError('暂时无法连接服务，请检查网络后重试。')
      }
    })()
    return () => {
      active = false
    }
  }, [isConfigured, reload])

  const questionVariable = promptConfig?.prompt_variables.find(item => ['query', 'question'].includes(item.key) && ['string', 'paragraph'].includes(item.type))
    || promptConfig?.prompt_variables.find(item => ['string', 'paragraph'].includes(item.type))

  const selectQuestion = (question: string) => {
    if (!questionVariable || isBusy)
      return
    setInputs(current => ({ ...current, [questionVariable.key]: question }))
    composerRef.current?.querySelector<HTMLTextAreaElement>('textarea')?.focus()
  }

  const handleSend = () => {
    if (isBusy)
      return
    setControlSend(current => current + 1)
    if (window.matchMedia('(max-width: 820px)').matches)
      answerRef.current?.scrollIntoView({ block: 'start' })
  }

  return (
    <div className='site-shell'>
      <a className='skip-link' href='#question'>跳到提问</a>
      <header className='site-header'>
        <div className='header-inner'>
          <a className='brand' href='/' aria-label='越海首页'>
            <svg className='brand-mark' viewBox='0 0 40 40' aria-hidden='true'>
              <rect width='40' height='40' rx='12' fill='currentColor' />
              <path d='m12 27 7-16 3 10 7 6H12Z M10 31h20' fill='none' stroke='white' strokeWidth='1.8' strokeLinejoin='round' strokeLinecap='round' />
            </svg>
            <span>{APP_INFO.title}</span>
            <span className='brand-description'>跨境电商 AI 知识助手</span>
          </a>
          <span className='header-note'>让每一步出海，更有方向</span>
        </div>
      </header>
      <main className='main-content'>
        <section className='intro'>
          <h1>跨境生意的难题，<br className='mobile-break' /><span>一起理清。</span></h1>
          <p>{APP_INFO.description}</p>
          <div className='platforms' aria-label='支持的话题平台'>
            <span>Amazon</span><span>Temu</span><span>TikTok Shop</span><span>Shopee</span>
          </div>
        </section>
        <div className='workspace'>
          <section className='question-panel' aria-label='提问区域'>
            <div className='suggestions-heading'><h2>从一个问题开始</h2><span>点击填入</span></div>
            <div className='suggestions'>
              {questions.map(question => (
                <button className='suggestion' type='button' key={question.text}
                  disabled={!questionVariable || isBusy} onClick={() => selectQuestion(question.text)}>
                  <span className='suggestion-topic'>{question.topic}</span>
                  <span className='suggestion-text'>{question.text}</span>
                  <ArrowUpRightIcon aria-hidden='true' />
                </button>
              ))}
            </div>
            <div ref={composerRef} className='composer-wrap'>
              {appError
                ? <div className='connection-error' role='alert'><p>{appError}</p><button type='button' onClick={() => setReload(current => current + 1)}><ArrowPathIcon aria-hidden='true' />重新连接</button></div>
                : promptConfig
                  ? <RunOnce inputs={inputs} onInputsChange={setInputs} promptConfig={promptConfig}
                    onSend={handleSend} visionConfig={visionConfig} onVisionFilesChange={setCompletionFiles}
                    isBusy={isBusy} questionKey={questionVariable?.key} />
                  : <div className='composer-loading' role='status'><span className='loading-ring' />正在连接知识助手…</div>
              }
            </div>
            <p className='question-hint'>带上平台、站点和具体情况，回答会更有针对性。</p>
          </section>
          <section className='answer-panel' ref={answerRef} aria-labelledby='answer-heading' aria-busy={isBusy}>
            <div className='answer-heading'><h2 id='answer-heading'>分析与建议</h2><span className={isBusy ? 'answer-status active' : 'answer-status'}>{isBusy ? '正在整理思路' : controlSend ? '本次回答' : '等待你的问题'}</span></div>
            <Result isWorkflow={IS_WORKFLOW} isCallBatchAPI={false} isPC isMobile={false} isError={false}
              promptConfig={promptConfig} inputs={inputs} controlSend={controlSend}
              onShowRes={() => {}} onCompleted={() => {}} onRespondingChange={setIsBusy}
              visionConfig={visionConfig} completionFiles={completionFiles} />
          </section>
        </div>
        <BusinessTips />
      </main>
      <footer className='site-footer'><span>越海 · 专注跨境电商知识</span><span>AI 回答仅供参考，平台政策与合规要求请以官方信息为准。</span></footer>
    </div>
  )
}
