import { randomUUID, timingSafeEqual } from 'node:crypto'

export const runtime = 'nodejs'

const DURATION_MS = 45000
const INTERVAL_MS = 5000

export async function POST(request: Request) {
  const url = new URL(request.url)
  const host = process.env.STREAM_DIAGNOSTIC_PREVIEW_HOST || ''
  const token = process.env.STREAM_DIAGNOSTIC_TOKEN || ''
  const until = Date.parse(process.env.STREAM_DIAGNOSTIC_UNTIL || '')
  const remaining = until - Date.now()
  const authorization = request.headers.get('authorization') || ''
  const supplied = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  const encoder = new TextEncoder()
  const expectedBytes = encoder.encode(token)
  const suppliedBytes = encoder.encode(supplied)
  if (process.env.STREAM_DIAGNOSTIC_MODE !== 'deploy-preview'
    || !/^deploy-preview-\d+--yuehaiai\.netlify\.app$/.test(host)
    || url.hostname !== host || url.port || url.protocol !== 'https:'
    || !Number.isFinite(remaining) || remaining < DURATION_MS || remaining > 60 * 60 * 1000
    || expectedBytes.length < 32 || expectedBytes.length > 256
    || expectedBytes.length !== suppliedBytes.length
    || !timingSafeEqual(expectedBytes, suppliedBytes))
    return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } })

  const probeId = randomUUID()
  const started = Date.now()
  let seq = 0
  let ended = false
  let timer: ReturnType<typeof setInterval> | undefined
  let abort: () => void = () => {}
  const log = (state: string) => console.info(JSON.stringify({
    diagnostic: 'controlled_sse',
    probe_id: probeId,
    state,
    seq,
    elapsed_ms: Date.now() - started,
    at: new Date().toISOString(),
    runtime_node: process.version,
  }))
  const stop = (state: string) => {
    if (ended)
      return
    ended = true
    clearInterval(timer)
    request.signal.removeEventListener('abort', abort)
    log(state)
  }
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: 'diagnostic_tick' | 'diagnostic_complete') => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event, probe_id: probeId, seq, elapsed_ms: Date.now() - started })}\n\n`))
        log(event === 'diagnostic_complete' ? 'sent_complete' : 'sent_tick')
      }
      abort = () => {
        stop('request_aborted')
        controller.close()
      }
      if (request.signal.aborted) {
        abort()
        return
      }
      request.signal.addEventListener('abort', abort, { once: true })
      log('start')
      send('diagnostic_tick')
      timer = setInterval(() => {
        if (ended)
          return
        seq += 1
        if (seq === 9) {
          send('diagnostic_complete')
          stop('complete')
          controller.close()
        }
        else {
          send('diagnostic_tick')
        }
      }, INTERVAL_MS)
    },
    cancel() {
      stop('reader_cancelled')
    },
  })
  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      'X-Stream-Probe-Id': probeId,
    },
  })
}
