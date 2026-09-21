'use client'
import type { FC } from 'react'
import React, { useEffect, useRef, useState } from 'react'
import { useBoolean } from 'ahooks'
import { t } from 'i18next'
import produce from 'immer'
import { ArrowPathIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'
import TextGenerationRes from './item'
import Toast from '@/app/components/base/toast'
import { sendCompletionMessage, sendWorkflowMessage, updateFeedback } from '@/service'
import type { Feedbacktype, PromptConfig, VisionFile, VisionSettings, WorkflowProcess } from '@/types/app'
import { NodeRunningStatus, TransferMethod, WorkflowRunningStatus } from '@/types/app'
import { sleep } from '@/utils'

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
  useEffect(() => {
    if (controlStopResponding)
      setResponsingFalse()
  }, [controlStopResponding])

  const [completionRes, doSetCompletionRes] = useState('')
  const completionResRef = useRef('')
  const setCompletionRes = (res: string) => {
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

  const { notify } = Toast
  const isNoData = !completionRes

  const [messageId, setMessageId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Feedbacktype>({
    rating: null,
  })

  const handleFeedback = async (feedback: Feedbacktype) => {
    await updateFeedback({ url: `/messages/${messageId}/feedbacks`, body: { rating: feedback.rating } })
    setFeedback(feedback)
  }

  const logError = (message: string) => {
    notify({ type: 'error', message })
  }

  const checkCanSend = () => {
    // batch will check outer
    if (isCallBatchAPI)
      return true

    const prompt_variables = promptConfig?.prompt_variables
    if (!prompt_variables || prompt_variables?.length === 0)
      return true

    let hasEmptyInput = ''
    const requiredVars = prompt_variables?.filter(({ key, name, required }) => {
      const res = (!key || !key.trim()) || (!name || !name.trim()) || (required || required === undefined || required === null)
      return res
    }) || [] // compatible with old version
    requiredVars.forEach(({ key, name }) => {
      if (hasEmptyInput)
        return

      if (!String(inputs[key] ?? '').trim())
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
    return !hasEmptyInput
  }

  const handleSend = async () => {
    if (isBusy) {
      notify({ type: 'info', message: t('appDebug.errorMessage.waitForResponse') })
      return false
    }

    if (!checkCanSend())
      return

    const data: Record<string, any> = {
      inputs,
    }
    if (visionConfig.enabled && completionFiles && completionFiles?.length > 0) {
      data.files = completionFiles.map((item) => {
        if (item.transfer_method === TransferMethod.local_file) {
          return {
            ...item,
            url: '',
          }
        }
        return item
      })
    }

    setMessageId(null)
    setFeedback({
      rating: null,
    })
    setCompletionRes('')
    setWorkflowProccessData(undefined)
    setRequestFailed(false)

    const res: string[] = []
    let tempMessageId = ''

    if (!isPC)
      onShowRes()

    setResponsingTrue()
    let isEnd = false
    let isTimeout = false;
    (async () => {
      await sleep(1000 * 60) // 1min timeout
      if (!isEnd) {
        setResponsingFalse()
        setWorkflowProccessData(undefined)
        setRequestFailed(true)
        onCompleted(getCompletionRes(), taskId, false)
        isTimeout = true
      }
    })()

    if (isWorkflow) {
      sendWorkflowMessage(
        data,
        {
          onWorkflowStarted: ({ workflow_run_id }) => {
            if (isTimeout)
              return
            tempMessageId = workflow_run_id
            setWorkflowProccessData({
              status: WorkflowRunningStatus.Running,
              tracing: [],
              expand: false,
            })
            setResponsingFalse()
          },
          onNodeStarted: ({ data }) => {
            if (isTimeout)
              return
            setWorkflowProccessData(produce(getWorkflowProccessData()!, (draft) => {
              draft.expand = true
              draft.tracing!.push({
                ...data,
                status: NodeRunningStatus.Running,
                expand: true,
              } as any)
            }))
          },
          onNodeFinished: ({ data }) => {
            if (isTimeout)
              return
            setWorkflowProccessData(produce(getWorkflowProccessData()!, (draft) => {
              const currentIndex = draft.tracing!.findIndex(trace => trace.node_id === data.node_id)
              if (currentIndex > -1 && draft.tracing) {
                draft.tracing[currentIndex] = {
                  ...(draft.tracing[currentIndex].extras
                    ? { extras: draft.tracing[currentIndex].extras }
                    : {}),
                  ...data,
                  expand: !!data.error,
                } as any
              }
            }))
          },
          onWorkflowFinished: ({ data }) => {
            if (isTimeout)
              return
            if (data.error || data.status !== 'succeeded') {
              setRequestFailed(true)
              setWorkflowProccessData(undefined)
              setResponsingFalse()
              onCompleted(getCompletionRes(), taskId, false)
              isEnd = true
              return
            }
            setWorkflowProccessData(produce(getWorkflowProccessData()!, (draft) => {
              draft.status = data.error ? WorkflowRunningStatus.Failed : WorkflowRunningStatus.Succeeded
            }))
            if (!data.outputs)
              setCompletionRes('')
            else if (Object.keys(data.outputs).length > 1)
              setCompletionRes(data.outputs)
            else
              setCompletionRes(data.outputs[Object.keys(data.outputs)[0]])
            setResponsingFalse()
            setMessageId(tempMessageId)
            onCompleted(getCompletionRes(), taskId, true)
            isEnd = true
          },
          onError: () => {
            if (isTimeout)
              return
            setRequestFailed(true)
            setWorkflowProccessData(undefined)
            setResponsingFalse()
            onCompleted(getCompletionRes(), taskId, false)
            isEnd = true
          },
        },
      )
    }
    else {
      sendCompletionMessage(data, {
        onData: (data: string, _isFirstMessage: boolean, { messageId }) => {
          if (isTimeout)
            return
          tempMessageId = messageId
          res.push(data)
          setCompletionRes(res.join(''))
        },
        onCompleted: () => {
          if (isTimeout)
            return

          setResponsingFalse()
          setMessageId(tempMessageId)
          onCompleted(getCompletionRes(), taskId, true)
          isEnd = true
        },
        onError() {
          if (isTimeout)
            return

          setResponsingFalse()
          setRequestFailed(true)
          onCompleted(getCompletionRes(), taskId, false)
          isEnd = true
        },
      })
    }
  }

  useEffect(() => {
    if (controlSend)
      handleSend()
  }, [controlSend])

  useEffect(() => {
    if (controlRetry)
      handleSend()
  }, [controlRetry])

  const renderTextGenerationRes = () => (
    <TextGenerationRes
      isWorkflow={isWorkflow}
      workflowProcessData={workflowProcessData}
      className='mt-3'
      isError={isError}
      isResponding={isBusy}
      onRetry={handleSend}
      content={completionRes}
      messageId={messageId}
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
  if (isBusy && isNoData) {
    return <div className='answer-loading' role='status'>
      <p className='loading-message'><span className='loading-ring' />正在分析你的问题，请稍候…</p>
      <div className='skeleton-line' aria-hidden='true' /><div className='skeleton-line' aria-hidden='true' /><div className='skeleton-line' aria-hidden='true' />
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
