'use client'
import React, { useEffect, useRef, useState } from 'react'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import RunOnce from './run-once'
import Result from './result'
import TaskLauncher from './task-launcher'
import { useOperatingEnvironment } from './site-shell/environment'
import { APP_INFO, IS_WORKFLOW } from '@/config'
import type { TaskId } from '@/config/tasks'
import { TASKS, TASK_GUIDES } from '@/config/tasks'
import { toWorkflowContext } from '@/config/operating-environment'
import { isWorkflowContextKey } from '@/utils/workflow-context'
import { fetchAppParams } from '@/service'
import { userInputsFormToPromptVariables } from '@/utils/prompt'
import { changeLanguage } from '@/i18n/i18next-config'
import type { PromptConfig, VisionFile, VisionSettings } from '@/types/app'
import { Resolution, TransferMethod } from '@/types/app'

export default function TextGeneration({ isConfigured }: { isConfigured: boolean }) {
  const { environment, storageUnavailable } = useOperatingEnvironment()
  const [activeTask, setActiveTask] = useState<TaskId | null>(null)
  const [pendingExample, setPendingExample] = useState<string | null>(null)
  const [exampleNotice, setExampleNotice] = useState('')
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
  const pendingFocus = useRef(false)

  useEffect(() => {
    const task = new URLSearchParams(window.location.search).get('task')
    const selected = TASKS.find(item => item.id === task)
    if (selected) {
      setActiveTask(selected.id)
      pendingFocus.current = true
    }
    else if (window.location.hash === '#ask') {
      pendingFocus.current = true
    }
  }, [])

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
          .filter(item => !isWorkflowContextKey(item.key))
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

  const taskQuestion = activeTask ? TASK_GUIDES[activeTask].questions[0] : null
  const placeholder = taskQuestion
    ? `例如：${environment ? taskQuestion.contextExample : taskQuestion.example}`
    : environment ? '例如：退款申请需要在多久内处理？' : '例如：TikTok Shop 商品被下架后怎么处理？'

  const focusQuestion = () => {
    const question = composerRef.current?.querySelector<HTMLTextAreaElement>('#question')
    if (question) {
      question.focus({ preventScroll: true })
      question.scrollIntoView({ block: 'center' })
      pendingFocus.current = false
    }
    else {
      pendingFocus.current = true
      composerRef.current?.scrollIntoView({ block: 'center' })
    }
  }

  useEffect(() => {
    if (questionVariable && pendingExample !== null) {
      setInputs(current => ({ ...current, [questionVariable.key]: pendingExample }))
      setPendingExample(null)
      setExampleNotice('已填入示例问题，可编辑并补充你的情况。')
    }
    if (questionVariable && pendingFocus.current)
      focusQuestion()
  }, [questionVariable, pendingExample])

  const selectQuestion = (question: string) => {
    if (isBusy)
      return
    if (questionVariable) {
      setInputs(current => ({ ...current, [questionVariable.key]: question }))
      setExampleNotice('已填入示例问题，可编辑并补充你的情况。')
    }
    else {
      setPendingExample(question)
      setExampleNotice('已选好问题，连接恢复后将填入输入框。')
    }
    focusQuestion()
  }

  const changeInputs = (nextInputs: Record<string, any>) => {
    setInputs(nextInputs)
    setExampleNotice('')
  }

  const handleSend = () => {
    if (isBusy)
      return
    setControlSend(current => current + 1)
    if (window.matchMedia('(max-width: 820px)').matches)
      answerRef.current?.scrollIntoView({ block: 'start' })
  }

  return (
    <main className='main-content home-page' id='main-content' tabIndex={-1}>
      <TaskLauncher activeTask={activeTask} onSelect={setActiveTask} onQuestion={selectQuestion}
        onCompose={focusQuestion} hasEnvironment={!!environment} isBusy={isBusy} />
      <section className='assistant-section' id='ask' aria-labelledby='ask-heading'>
        <div className='assistant-intro'><h2 id='ask-heading'>或者直接问越海 AI</h2><p>越海当前基于跨境电商知识库提供规则与经营信息辅助。</p></div>
        <div className='workspace'>
          <section className='question-panel' aria-label='提问区域'>
            {exampleNotice && <p className='example-notice' role='status'>{exampleNotice}{pendingExample && <span>{pendingExample}</span>}</p>}
            <div ref={composerRef} className='composer-wrap'>
              {appError
                ? <div className='connection-error' role='alert'><p>{appError}</p><button type='button' onClick={() => setReload(current => current + 1)}><ArrowPathIcon aria-hidden='true' />重新连接</button></div>
                : promptConfig
                  ? <RunOnce inputs={inputs} onInputsChange={changeInputs} promptConfig={promptConfig}
                    onSend={handleSend} visionConfig={visionConfig} onVisionFilesChange={setCompletionFiles}
                    isBusy={isBusy} questionKey={questionVariable?.key} questionPlaceholder={placeholder} />
                  : <div className='composer-loading' role='status'><span className='loading-ring' />正在连接知识助手…</div>
              }
            </div>
            <p className='question-hint'>回答将参考当前经营环境；若问题中明确指定其他平台或站点，以问题内容为准。</p>
            {storageUnavailable && <p className='question-hint' role='status'>浏览器暂不支持保存经营环境，选择仅在本次页面使用。</p>}
          </section>
          <section className='answer-panel' ref={answerRef} aria-labelledby='answer-heading' aria-busy={isBusy}>
            <div className='answer-heading'><h2 id='answer-heading'>分析与建议</h2><span className={isBusy ? 'answer-status active' : 'answer-status'}>{isBusy ? '正在整理思路' : controlSend ? '本次回答' : '等待你的问题'}</span></div>
            <Result isWorkflow={IS_WORKFLOW} isCallBatchAPI={false} isPC isMobile={false} isError={false}
              promptConfig={promptConfig} inputs={inputs} controlSend={controlSend} workflowContext={toWorkflowContext(environment)}
              onShowRes={() => {}} onCompleted={() => {}} onRespondingChange={setIsBusy}
              visionConfig={visionConfig} completionFiles={completionFiles} />
          </section>
        </div>
      </section>
    </main>
  )
}
