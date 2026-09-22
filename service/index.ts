import type { IOnActivity, IOnCompleted, IOnData, IOnError, IOnNodeFinished, IOnNodeStarted, IOnTextChunk, IOnWorkflowFinished, IOnWorkflowStarted } from './base'
import { get, post, ssePost } from './base'
import type { Feedbacktype } from '@/types/app'

export const sendCompletionMessage = async (body: Record<string, any>, { onData, onCompleted, onError, signal }: {
  onData: IOnData
  onCompleted: IOnCompleted
  onError: IOnError
  signal?: AbortSignal
}) => {
  return ssePost('completion-messages', {
    signal,
    body: {
      ...body,
      response_mode: 'streaming',
    },
  }, { onData, onCompleted, onError })
}

export const sendWorkflowMessage = async (
  body: Record<string, any>,
  {
    onWorkflowStarted,
    onNodeStarted,
    onNodeFinished,
    onWorkflowFinished,
    onTextChunk,
    onActivity,
    onError,
    signal,
  }: {
    onWorkflowStarted: IOnWorkflowStarted
    onNodeStarted: IOnNodeStarted
    onNodeFinished: IOnNodeFinished
    onError?: IOnError
    onWorkflowFinished: IOnWorkflowFinished
    onTextChunk: IOnTextChunk
    onActivity?: IOnActivity
    signal?: AbortSignal
  },
) => {
  return ssePost('workflows/run', {
    signal,
    body: {
      ...body,
      response_mode: 'streaming',
    },
  }, { onNodeStarted, onWorkflowStarted, onWorkflowFinished, onNodeFinished, onTextChunk, onActivity, onError })
}

export const fetchAppParams = async () => {
  return get('parameters')
}

export const updateFeedback = async ({ url, body }: { url: string; body: Feedbacktype }) => {
  return post(url, { body })
}
