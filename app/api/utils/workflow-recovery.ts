import { createHmac, timingSafeEqual } from 'node:crypto'

export const isWorkflowRunId = (value: unknown): value is string => typeof value === 'string' && /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(value)
const TTL = 10 * 60 * 1000
const signature = (id: string, user: string, expiry: string, key: string) => createHmac('sha256', key).update(`yuehai-workflow-recovery:v1\n${id}\n${user}\n${expiry}`).digest('hex')

export function createRecoveryToken(id: string, user: string, key: string, now = Date.now()) {
  const expiry = String(now + TTL)
  return `${expiry}.${signature(id, user, expiry, key)}`
}

export function verifyRecoveryToken(id: string, user: string, token: unknown, key: string, now = Date.now()) {
  if (!key || !isWorkflowRunId(id) || typeof token !== 'string' || !/^\d{1,16}\.[a-f\d]{64}$/.test(token))
    return false
  const [expiry, mac] = token.split('.')
  if (Number(expiry) <= now || Number(expiry) > now + TTL)
    return false
  return timingSafeEqual(new Uint8Array(Buffer.from(mac, 'hex')), new Uint8Array(Buffer.from(signature(id, user, expiry, key), 'hex')))
}

// Preserve every SSE line and heartbeat. Only augment events observed from Dify.
export function withRecoveryCredentials(stream: ReadableStream<Uint8Array>, user: string, key: string) {
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ''
  let runId = ''
  let token = ''
  const augment = (line: string) => {
    if (!line.startsWith('data:'))
      return line
    try {
      const event = JSON.parse(line.slice(5).trim())
      const id = event.workflow_run_id || (event.event === 'workflow_started' ? event.data?.id : undefined)
      if (key && isWorkflowRunId(id) && (!runId || id === runId)) {
        if (!runId) {
          runId = id
          token = createRecoveryToken(id, user, key)
        }
        return `data: ${JSON.stringify({ ...event, workflow_run_id: id, recovery_token: token })}`
      }
    }
    catch { /* Preserve unrecognized lines for the existing SSE parser. */ }
    return line
  }
  return stream.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      if (buffer.length > 1024 * 1024)
        throw new Error('SSE event exceeds size limit')
      if (lines.length)
        controller.enqueue(encoder.encode(`${lines.map(augment).join('\n')}\n`))
    },
    flush(controller) {
      buffer += decoder.decode()
      if (buffer)
        controller.enqueue(encoder.encode(augment(buffer)))
    },
  }))
}
