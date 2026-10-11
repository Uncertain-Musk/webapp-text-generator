import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import nextEnv from '@next/env'
import { readSSEStream, stripHiddenThinking } from '../service/sse-stream.ts'

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, all) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), all[index + 1]])
  return pairs
}, []))
if (!args.query || !args['output-dir']) {
  console.error('Usage: node script/diagnose-streaming.mjs --query "..." --platform Shopee --market "" --output-dir <new-directory> [--target all|direct|local|netlify]')
  process.exit(1)
}
let previewURL
if (args['preview-url']) {
  const url = new URL(args['preview-url'])
  if (args.target !== 'preview' || url.protocol !== 'https:' || url.port || url.username || url.password || url.search || url.hash
    || url.pathname !== '/' || !/^deploy-preview-\d+--yuehaiai\.netlify\.app$/.test(url.hostname))
    throw new Error('Preview diagnostics require --target preview and a Yuehai Deploy Preview base URL')
  previewURL = url.origin
}
if (args.target === 'preview' && !previewURL)
  throw new Error('--target preview requires --preview-url')
nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} })
const inputs = { query: args.query, platform_context: args.platform || '', market_context: args.market || '' }
const outputDir = path.resolve(args['output-dir'])
await mkdir(outputDir, { recursive: true })
const sessionId = randomUUID()
const headersToKeep = ['content-type', 'date', 'server', 'x-nf-request-id', 'x-powered-by', 'cache-control']
const safeHeaders = headers => Object.fromEntries(headersToKeep.map(key => [key, headers.get(key)]).filter(([, value]) => value))
const targets = [
  { name: 'direct', url: process.env.DIFY_API_URL?.replace(/\/$/, '') + '/workflows/run', direct: true },
  { name: 'local', url: (args['local-url'] || 'http://127.0.0.1:3000') + '/api/workflows/run' },
  { name: 'netlify', url: 'https://yuehaiai.netlify.app/api/workflows/run' },
  ...(previewURL ? [{ name: 'preview', url: previewURL + '/api/workflows/run' }] : []),
].filter(target => !args.target || args.target === 'all' || target.name === args.target)

for (const target of targets) {
  const started = performance.now()
  const elapsed = () => Math.round(performance.now() - started)
  const record = { target: target.name, started_at: new Date().toISOString(), inputs, headers_ms: null, first_event_ms: null, first_text_ms: null, last_event: null, last_event_ms: null, total_ms: null, completed: false, terminal_status: null, end_reason: null, events: [], partial_answer: '' }
  let text = ''
  const abort = new AbortController()
  let deadline = 'headers'
  const headerTimer = setTimeout(() => abort.abort(), 30000)
  const totalTimer = setTimeout(() => { deadline = 'diagnostic_budget'; abort.abort() }, 180000)
  console.log(JSON.stringify({ target: target.name, state: 'started', started_at: record.started_at }))
  try {
    if (target.direct && (!process.env.DIFY_API_KEY || !process.env.DIFY_API_URL))
      throw new Error('MissingDifyConfiguration')
    const headers = { 'Content-Type': 'application/json' }
    if (target.direct) headers.Authorization = 'Bearer ' + process.env.DIFY_API_KEY
    else headers.Cookie = 'session_id=' + sessionId
    const body = target.direct
      ? { inputs, response_mode: 'streaming', user: 'user_' + sessionId }
      : { inputs: { query: inputs.query }, platform_context: inputs.platform_context, market_context: inputs.market_context }
    const response = await fetch(target.url, { method: 'POST', headers, body: JSON.stringify(body), signal: abort.signal })
    clearTimeout(headerTimer)
    deadline = 'body'
    record.headers_ms = elapsed()
    record.http_status = response.status
    record.response_headers = safeHeaders(response.headers)
    if (!response.ok || !response.headers.get('content-type')?.includes('text/event-stream')) {
      record.end_reason = !response.ok ? 'http_error' : 'unexpected_content_type'
      await response.body?.cancel()
    } else {
      await readSSEStream(response, event => {
        const at = elapsed()
        const name = event.event || 'unknown'
        record.first_event_ms ??= at
        record.last_event = name
        record.last_event_ms = at
        if (event.workflow_run_id) record.workflow_run_id = event.workflow_run_id
        record.events.push({ event: name, elapsed_ms: at, ...(name === 'workflow_finished' ? { status: event.data?.status || null } : {}) })
        if (name === 'text_chunk' && typeof event.data?.text === 'string') {
          text += event.data.text
          if (stripHiddenThinking(text)) record.first_text_ms ??= at
        }
        if (name === 'workflow_finished') {
          record.completed = true
          record.terminal_status = event.data?.status || null
          record.workflow_elapsed_seconds = event.data?.elapsed_time ?? null
        }
        if (name === 'error') record.stream_error_code = event.code || 'unknown'
      })
      record.end_reason = record.completed ? 'terminal_event_received' : 'eof_without_workflow_finished'
    }
  } catch (error) {
    record.end_reason = abort.signal.aborted ? deadline + '_timeout' : 'transport_or_parse_error'
    record.error_type = error?.name || 'UnknownError'
    record.network_error_code = error?.cause?.code || null
  } finally {
    clearTimeout(headerTimer)
    clearTimeout(totalTimer)
    record.total_ms = elapsed()
    record.tail_idle_ms = record.last_event_ms === null ? null : record.total_ms - record.last_event_ms
    record.partial_answer = stripHiddenThinking(text)
    await writeFile(path.join(outputDir, target.name + '.json'), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' })
    console.log(JSON.stringify({ target: target.name, http_status: record.http_status ?? null, headers_ms: record.headers_ms, first_text_ms: record.first_text_ms, total_ms: record.total_ms, last_event: record.last_event, last_event_ms: record.last_event_ms, completed: record.completed, terminal_status: record.terminal_status, end_reason: record.end_reason, request_id: record.response_headers?.['x-nf-request-id'] || null, visible_characters: record.partial_answer.length }))
  }
}
