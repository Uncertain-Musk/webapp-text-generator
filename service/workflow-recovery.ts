export type WorkflowRecoveryCredential = { runId: string; token: string }
export type RecoveryResult = { status: string; answer?: string }
export const RECOVERY_ATTEMPTS = 12
const INTERVAL_MS = 3000
const REQUEST_TIMEOUT_MS = 8000
const TOTAL_TIMEOUT_MS = 90000

const waitForPoll = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  signal.throwIfAborted()
  let timer: ReturnType<typeof setTimeout>
  const abort = () => {
    clearTimeout(timer)
    reject(new DOMException('Cancelled', 'AbortError'))
  }
  timer = setTimeout(() => {
    signal.removeEventListener('abort', abort)
    resolve()
  }, ms)
  signal.addEventListener('abort', abort, { once: true })
})

export async function recoverWorkflowRun(
  credential: WorkflowRecoveryCredential | null,
  signal: AbortSignal,
  onAttempt: (attempt: number) => void,
  { fetcher = globalThis.fetch, wait = waitForPoll }: { fetcher?: typeof fetch; wait?: typeof waitForPoll } = {},
): Promise<RecoveryResult> {
  if (!credential?.runId || !credential.token)
    return { status: 'missing_run' }
  const deadline = Date.now() + TOTAL_TIMEOUT_MS
  let lastStatus = 'unavailable'
  for (let attempt = 1; attempt <= RECOVERY_ATTEMPTS && Date.now() < deadline; attempt++) {
    signal.throwIfAborted()
    onAttempt(attempt)
    const controller = new AbortController()
    const abort = () => controller.abort()
    signal.addEventListener('abort', abort, { once: true })
    const timer = setTimeout(abort, Math.min(REQUEST_TIMEOUT_MS, deadline - Date.now()))
    try {
      const response = await fetcher('/api/workflows/recover', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credential),
        signal: controller.signal,
      })
      signal.throwIfAborted()
      if (response.status === 401 || response.status === 403)
        return { status: 'unauthorized' }
      if (response.status === 404) {
        lastStatus = 'not_found'
      }
      else if (!response.ok) {
        lastStatus = 'unavailable'
      }
      else {
        const data = await response.json() as RecoveryResult
        signal.throwIfAborted()
        if (data.status === 'succeeded') {
          return (typeof data.answer === 'string' && data.answer.trim())
            ? { status: 'succeeded', answer: data.answer }
            : { status: 'empty_output' }
        }
        if (['failed', 'stopped', 'paused', 'partial-succeeded', 'empty_output'].includes(data.status))
          return { status: data.status }
        if (data.status !== 'running' && data.status !== 'pending')
          return { status: 'unknown' }
        lastStatus = 'pending'
      }
    }
    catch {
      signal.throwIfAborted()
      lastStatus = 'unavailable'
    }
    finally {
      clearTimeout(timer)
      signal.removeEventListener('abort', abort)
    }
    if (attempt < RECOVERY_ATTEMPTS && Date.now() < deadline)
      await wait(Math.min(INTERVAL_MS, deadline - Date.now()), signal)
  }
  return { status: lastStatus }
}

export function recoveryFailureMessage(status: string) {
  const messages: Record<string, string> = {
    'missing_run': '未收到可验证的任务标识，无法自动恢复。',
    'failed': '原任务执行失败（failed）。',
    'stopped': '原任务已停止（stopped）。',
    'paused': '原任务已暂停，需在 Dify 处理后继续（paused）。',
    'partial-succeeded': '原任务仅部分成功（partial-succeeded）。',
    'empty_output': '原任务已结束，但没有可用的完整答案；需检查 End 的 text 输出。',
    'pending': '原任务仍在运行，本次自动查询已达到上限。',
    'unauthorized': '恢复凭证失效或会话已变化，无法继续查询。',
    'not_found': '暂未查到原任务，自动查询已结束。',
    'unavailable': '暂时无法查询原任务状态，自动查询已结束。',
    'unknown': '原任务返回了无法识别的状态，未确认回答完成。',
  }
  return `回答未完成。${messages[status] || messages.unknown}已保留生成内容；重新分析会发起新任务。`
}
