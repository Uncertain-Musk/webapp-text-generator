'use client'
import type { FC } from 'react'
import React, { useEffect, useRef, useState } from 'react'
import { useBoolean } from 'ahooks'
import { t } from 'i18next'
import produce from 'immer'
import { ArrowPathIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'
import TextGenerationRes from './item'
import Toast from '@/app/components/base/toast'
import { sendCompletionMessage, sendWorkflowMessage } from '@/service'
import { stripHiddenThinking } from '@/service/sse-stream'
import type { Feedbacktype, PromptConfig, VisionFile, VisionSettings, WorkflowProcess } from '@/types/app'
import { NodeRunningStatus, TransferMethod, WorkflowRunningStatus } from '@/types/app'

const STREAM_RENDER_INTERVAL = 80
const STREAM_ACTIVITY_TIMEOUT = 60 * 1000
const ANALYSIS_STAGES = ['理解你的问题', '检索跨境电商知识库', '整理分析与建议']

const getWorkflowOutput = (outputs: any) => {
  if (!outputs)
    return ''
  if (typeof outputs !== 'object' || Array.isArray(outputs))
    return outputs

  const keys = Object.keys(outputs)
  if (keys.length === 0)
    return ''
  if (keys.length === 1)
    return outputs[keys[0]]
  return outputs
}

const sanitizeWorkflowOutput = (output: any): any => {
  if (typeof output === 'string')
    return stripHiddenThinking(output)
  if (Array.isArray(output))
    return output.map(sanitizeWorkflowOutput)
  if (output && typeof output === 'object') {
    return Object.fromEntries(
      Object.entries(output).map(([key, value]) => [key, sanitizeWorkflowOutput(value)]),
    )
  }
  return output
}

export type IResultProps = {
  isWorkflow: boolean
  isCallBatchAPI: boolean
  isPC: boolean
  isMobile: boolean
  isError: boolean
  promptConfig: PromptConfig | null
  inputs: Record<string, any>
  controlSend?: number
  controlRetry?: number
  controlStopResponding?: number
  onShowRes: () => void
  taskId?: number
  onCompleted: (completionRes: string, taskId?: number, success?: boolean) => void
  visionConfig: VisionSettings
  completionFiles: VisionFile[]
  onRespondingChange?: (responding: boolean) => void
}

const Result: FC<IResultProps> = ({
  isWorkflow,
  isCallBatchAPI,
  isPC,
  isMobile,
  isError,
  promptConfig,
  inputs,
  controlSend,
  controlRetry,
  controlStopResponding,
  onShowRes,
  taskId,
  onCompleted,
  visionConfig,
  completionFiles,
  onRespondingChange,
}) => {
  const [isResponsing, { setTrue: setResponsingTrue, setFalse: setResponsingFalse }] = useBoolean(false)
  const [requestFailed, setRequestFailed] = useState(false)
  const [analysisStage, setAnalysisStage] = useState(0)
  const [hasStartedStreaming, setHasStartedStreaming] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const activityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const renderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestSerialRef = useRef(0)

  const [completionRes, doSetCompletionRes] = useState<any>('')
  const completionResRef = useRef<any>('')
  const setCompletionRes = (res: any) => {
    completionResRef.current = res
    doSetCompletionRes(res)
  }
  const getCompletionRes = () => completionResRef.current
  const [workflowProcessData, doSetWorkflowProccessData] = useState<WorkflowProcess>()
  const workflowProcessDataRef = useRef<WorkflowProcess>()
  const setWorkflowProccessData = (data: WorkflowProcess | undefined) => {
    workflowProcessDataRef.current = data
    doSetWorkflowProccessData(data)
  }
  const getWorkflowProccessData = () => workflowProcessDataRef.current
  const isBusy = isResponsing || workflowProcessData?.status === WorkflowRunningStatus.Running

  useEffect(() => {
    onRespondingChange?.(isBusy)
  }, [isBusy, onRespondingChange])

  useEffect(() => {
    return () => {
      requestSerialRef.current += 1
      abortControllerRef.current?.abort()
      if (activityTimerRef.current)
        clearTimeout(activityTimerRef.current)
      if (renderTimerRef.current)
        clearTimeout(renderTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!controlStopResponding)
      return
    requestSerialRef.current += 1
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    if (activityTimerRef.current)
      clearTimeout(activityTimerRef.current)
    if (renderTimerRef.current)
      clearTimeout(renderTimerRef.current)
    setWorkflowProccessData(undefined)
    setResponsingFalse()
  }, [controlStopResponding, setResponsingFalse])

  const { notify } = Toast
  const isNoData = !completionRes
  const [feedback, setFeedback] = useState<Feedbacktype>({ rating: null })

  const handleFeedback = (nextFeedback: Feedbacktype) => {
    setFeedback(current => ({
      rating: current.rating === nextFeedback.rating ? null : nextFeedback.rating,
    }))
  }

  const logError = (message: string) => {
    notify({ type: 'error', message })
  }

  const checkCanSend = () => {
    if (isCallBatchAPI)
      return true

    const prompt_variables = promptConfig?.prompt_variables
    if (!prompt_variables || prompt_variables.length === 0)
      return true

    let hasEmptyInput = ''
    const requiredVars = prompt_variables.filter(({ key, name, required }) => {
      return (!key || !key.trim()) || (!name || !name.trim()) || (required || required === undefined || required === null)
    })
    requiredVars.forEach(({ key, name }) => {
      if (!hasEmptyInput && !String(inputs[key] ?? '').trim())
        hasEmptyInput = name
    })

    if (hasEmptyInput) {
      logError(`请填写${hasEmptyInput}`)
      return false
    }
    if (completionFiles.find(item => item.transfer_method === TransferMethod.local_file && !item.upload_file_id)) {
      notify({ type: 'info', message: t('appDebug.errorMessage.waitForImgUpload') })
      return false
    }
    return true
  }

  const handleSend = async () => {
    if (isBusy) {
      notify({ type: 'info', message: t('appDebug.errorMessage.waitForResponse') })
      return false
    }
    if (!checkCanSend())
      return

    const data: Record<string, any> = { inputs }
    if (visionConfig.enabled && completionFiles?.length > 0) {
      data.files = completionFiles.map((item) => {
        if (item.transfer_method === TransferMethod.local_file)
          return { ...item, url: '' }
        return item
      })
    }

    abortControllerRef.current?.abort()
    if (activityTimerRef.current)
      clearTimeout(activityTimerRef.current)
    if (renderTimerRef.current)
      clearTimeout(renderTimerRef.current)

    const requestId = requestSerialRef.current + 1
    requestSerialRef.current = requestId
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    let isEnd = false
    let isTimeout = false
    let streamedText = ''
    let receivedFirstChunk = false
    let lastVisibleText = ''
    let nodeCount = 0
    const isCurrentRequest = () => requestSerialRef.current === requestId

    setFeedback({ rating: null })
    setCompletionRes('')
    setWorkflowProccessData(undefined)
    setRequestFailed(false)
    setAnalysisStage(0)
    setHasStartedStreaming(false)

    if (!isPC)
      onShowRes()

    const clearRequestTimers = () => {
      if (activityTimerRef.current) {
        clearTimeout(activityTimerRef.current)
        activityTimerRef.current = null
      }
      if (renderTimerRef.current) {
        clearTimeout(renderTimerRef.current)
        renderTimerRef.current = null
      }
    }

    const settleRequest = (success: boolean) => {
      if (!isCurrentRequest() || isEnd)
        return
      isEnd = true
      clearRequestTimers()
      abortControllerRef.current = null
      setResponsingFalse()
      onCompleted(getCompletionRes(), taskId, success)
    }

    const failRequest = () => {
      if (!isCurrentRequest() || isEnd)
        return
      setRequestFailed(true)
      setWorkflowProccessData(undefined)
      settleRequest(false)
    }

    const handleActivityTimeout = () => {
      if (!isCurrentRequest() || isEnd)
        return
      isTimeout = true
      abortController.abort()
      failRequest()
    }

    const markActivity = () => {
      if (!isCurrentRequest() || isEnd)
        return
      if (activityTimerRef.current)
        clearTimeout(activityTimerRef.current)
      activityTimerRef.current = setTimeout(handleActivityTimeout, STREAM_ACTIVITY_TIMEOUT)
    }

    const flushStreamedText = () => {
      if (!isCurrentRequest() || isEnd)
        return
      if (renderTimerRef.current) {
        clearTimeout(renderTimerRef.current)
        renderTimerRef.current = null
      }
      const visibleText = stripHiddenThinking(streamedText)
      lastVisibleText = visibleText
      setCompletionRes(visibleText)
    }

    const queueTextChunk = (text: string) => {
      if (!text || !isCurrentRequest() || isEnd)
        return
      streamedText += text
      const visibleText = stripHiddenThinking(streamedText)
      if (!visibleText || visibleText === lastVisibleText)
        return
      if (!receivedFirstChunk) {
        receivedFirstChunk = true
        lastVisibleText = visibleText
        setHasStartedStreaming(true)
        setCompletionRes(visibleText)
        return
      }
      if (!renderTimerRef.current)
        renderTimerRef.current = setTimeout(flushStreamedText, STREAM_RENDER_INTERVAL)
    }

    setResponsingTrue()
    markActivity()

    if (isWorkflow) {
      void sendWorkflowMessage(data, {
        signal: abortController.signal,
        onActivity: markActivity,
        onTextChunk: queueTextChunk,
        onWorkflowStarted: () => {
          if (isTimeout || !isCurrentRequest())
            return
          setWorkflowProccessData({
            status: WorkflowRunningStatus.Running,
            tracing: [],
            expand: false,
          })
          setResponsingFalse()
        },
        onNodeStarted: ({ data }) => {
          if (isTimeout || !isCurrentRequest())
            return
          nodeCount += 1
          setAnalysisStage(nodeCount === 1 ? 1 : 2)
          const currentProcess = getWorkflowProccessData()
          if (!currentProcess)
            return
          setWorkflowProccessData(produce(currentProcess, (draft) => {
            draft.expand = true
            draft.tracing!.push({
              ...data,
              status: NodeRunningStatus.Running,
              expand: true,
            } as any)
          }))
        },
        onNodeFinished: ({ data }) => {
          if (isTimeout || !isCurrentRequest())
            return
          setAnalysisStage(2)
          const currentProcess = getWorkflowProccessData()
          if (!currentProcess)
            return
          setWorkflowProccessData(produce(currentProcess, (draft) => {
            const currentIndex = draft.tracing!.findIndex(trace => trace.node_id === data.node_id)
            if (currentIndex > -1 && draft.tracing) {
              draft.tracing[currentIndex] = {
                ...(draft.tracing[currentIndex].extras ? { extras: draft.tracing[currentIndex].extras } : {}),
                ...data,
                expand: !!data.error,
              } as any
            }
          }))
        },
        onWorkflowFinished: ({ data }) => {
          if (isTimeout || !isCurrentRequest())
            return
          if (data.error || data.status !== 'succeeded') {
            failRequest()
            return
          }

          if (renderTimerRef.current) {
            clearTimeout(renderTimerRef.current)
            renderTimerRef.current = null
          }
          const finalOutput = sanitizeWorkflowOutput(getWorkflowOutput(data.outputs))
          setCompletionRes(finalOutput || stripHiddenThinking(streamedText))
          const currentProcess = getWorkflowProccessData()
          if (currentProcess) {
            setWorkflowProccessData(produce(currentProcess, (draft) => {
              draft.status = WorkflowRunningStatus.Succeeded
            }))
          }
          settleRequest(true)
        },
        onError: () => {
          if (!isTimeout)
            failRequest()
        },
      })
    }
    else {
      void sendCompletionMessage(data, {
        signal: abortController.signal,
        onData: (text: string) => {
          if (isTimeout || !isCurrentRequest())
            return
          markActivity()
          queueTextChunk(text)
        },
        onCompleted: () => {
          if (isTimeout || !isCurrentRequest())
            return
          if (renderTimerRef.current)
            clearTimeout(renderTimerRef.current)
          setCompletionRes(stripHiddenThinking(streamedText))
          settleRequest(true)
        },
        onError: () => {
          if (!isTimeout)
            failRequest()
        },
      })
    }
  }

  useEffect(() => {
    if (controlSend)
      handleSend()
  }, [controlSend]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (controlRetry)
      handleSend()
  }, [controlRetry]) // eslint-disable-line react-hooks/exhaustive-deps

  const renderTextGenerationRes = () => (
    <TextGenerationRes
      isWorkflow={isWorkflow}
      workflowProcessData={workflowProcessData}
      className='mt-3'
      isError={isError}
      isResponding={isBusy}
      onRetry={handleSend}
      content={completionRes}
      isInWebApp
      onFeedback={handleFeedback}
      feedback={feedback}
      isMobile={isMobile}
      isLoading={isCallBatchAPI ? (!completionRes && isResponsing) : false}
      taskId={isCallBatchAPI ? ((taskId as number) < 10 ? `0${taskId}` : `${taskId}`) : undefined}
    />
  )

  if (requestFailed) {
    return <div className='answer-error' role='alert'>
      <p>这次分析未能完成。请检查网络，或稍后重新尝试。</p>
      <button className='retry-button' type='button' onClick={handleSend}><ArrowPathIcon aria-hidden='true' />重新分析</button>
    </div>
  }
  if (isBusy && isNoData && !hasStartedStreaming) {
    return <div className='answer-loading' role='status'>
      <div className='analysis-progress' aria-label='分析进度'>
        {ANALYSIS_STAGES.map((stage, index) => (
          <React.Fragment key={stage}>
            <div className={index < analysisStage ? 'analysis-step complete' : index === analysisStage ? 'analysis-step active' : 'analysis-step'}>
              <span className='analysis-step-dot'>{index < analysisStage ? '✓' : index + 1}</span>
              <span>{stage}</span>
            </div>
            {index < ANALYSIS_STAGES.length - 1 && <span className='analysis-step-arrow' aria-hidden='true'>→</span>}
          </React.Fragment>
        ))}
      </div>
      <p className='loading-message'><span className='loading-ring' />正在准备与你的问题相关的分析</p>
    </div>
  }
  if (isNoData) {
    return <div className='answer-empty'>
      <ChatBubbleLeftRightIcon className='empty-symbol' strokeWidth={1} aria-hidden='true' />
      <h3>从疑问，到清晰的下一步</h3>
      <p>选择一个推荐问题，或描述你遇到的情况。<br />分析与建议将在这里呈现。</p>
    </div>
  }
  return <div className='answer-content'>{renderTextGenerationRes()}</div>
}

export default React.memo(Result)
