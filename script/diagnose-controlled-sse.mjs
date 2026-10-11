import { writeFile } from 'node:fs/promises'
import { readSSEStream } from '../service/sse-stream.ts'

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, all) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), all[index + 1]])
  return pairs
}, []))
if (!args.url || !args.output || !process.env.STREAM_DIAGNOSTIC_TOKEN)
  throw new Error('Required: --url <preview-url> --output <new-json-file> and STREAM_DIAGNOSTIC_TOKEN in environment')
const url = new URL(args.url)
const localRehearsal = process.argv.includes('--local-rehearsal')
const isPreview = url.protocol === 'https:' && !url.port && /^deploy-preview-\d+--yuehaiai\.netlify\.app$/.test(url.hostname)
const isLocal = localRehearsal && url.protocol === 'http:' && url.hostname === '127.0.0.1'
if ((!isPreview && !isLocal) || url.username || url.password || url.search || url.hash || url.pathname !== '/')
  throw new Error('Only a Yuehai Deploy Preview base URL, or explicit loopback local rehearsal, is permitted')
const cancelAfter = args['cancel-after-ms'] ? Number(args['cancel-after-ms']) : null
if (cancelAfter !== null && (!Number.isInteger(cancelAfter) || cancelAfter <= 0 || cancelAfter >= 45000))
  throw new Error('Cancellation must be between 1 and 44999 milliseconds')

const start = performance.now()
const elapsed = () => Math.round(performance.now() - start)
const record = { environment: isLocal ? 'local_rehearsal' : 'netlify_deploy_preview', started_at: new Date().toISOString(), url: url.origin, events: [], completed: false, end_reason: null }
const abort = new AbortController()
let intentionalCancel = false
const deadline = setTimeout(() => abort.abort(), 70000)
const cancelTimer = cancelAfter === null ? null : setTimeout(() => { intentionalCancel = true; abort.abort() }, cancelAfter)
try {
  const response = await fetch(new URL('/api/diagnostics/stream', url), {
    method: 'POST', headers: { Authorization: 'Bearer ' + process.env.STREAM_DIAGNOSTIC_TOKEN }, signal: abort.signal,
  })
  record.headers_ms = elapsed()
  record.http_status = response.status
  record.request_id = response.headers.get('x-nf-request-id')
  record.probe_id = response.headers.get('x-stream-probe-id')
  await readSSEStream(response, event => {
    record.events.push({ event: event.event, seq: event.seq, probe_id: event.probe_id, server_elapsed_ms: event.elapsed_ms, client_elapsed_ms: elapsed() })
  })
  const last = record.events.at(-1)
  record.completed = record.events.length === 10 && record.events.every((event, index) => event.seq === index && event.probe_id === record.probe_id)
    && last.event === 'diagnostic_complete' && last.server_elapsed_ms >= 45000
  record.end_reason = record.completed ? 'diagnostic_complete' : 'eof_without_complete_sequence'
} catch (error) {
  record.end_reason = intentionalCancel ? 'client_cancelled' : abort.signal.aborted ? 'diagnostic_budget_exhausted' : 'transport_or_http_error'
  record.error_type = error?.name || 'UnknownError'
} finally {
  clearTimeout(deadline)
  clearTimeout(cancelTimer)
  record.total_ms = elapsed()
  record.first_event_ms = record.events[0]?.client_elapsed_ms ?? null
  record.last_event = record.events.at(-1)?.event ?? null
  record.last_event_ms = record.events.at(-1)?.client_elapsed_ms ?? null
  await writeFile(args.output, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' })
  console.log(JSON.stringify({ ...record, events: undefined }))
  if (!record.completed && record.end_reason !== 'client_cancelled') process.exitCode = 1
}
