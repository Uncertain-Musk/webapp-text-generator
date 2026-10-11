import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'
import { readSSEStream } from '../service/sse-stream.ts'

const realRequire = createRequire(import.meta.url)
const compiled = ts.transpileModule(readFileSync(new URL('../app/api/diagnostics/stream/route.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const previewHost = 'deploy-preview-123--yuehaiai.netlify.app'
const token = 'test-only-0123456789abcdef0123456789abcdef'
const validEnv = () => ({ STREAM_DIAGNOSTIC_MODE: 'deploy-preview', STREAM_DIAGNOSTIC_PREVIEW_HOST: previewHost, STREAM_DIAGNOSTIC_TOKEN: token, STREAM_DIAGNOSTIC_UNTIL: new Date(Date.now() + 30 * 60 * 1000).toISOString() })
const request = (host = previewHost, options = {}) => new Request(`https://${host}/api/diagnostics/stream`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, ...options })
function loadRoute(env = validEnv()) {
  const exports = {}
  const log = []
  new Function('require', 'exports', 'process', 'console', compiled)(realRequire, exports, { env, version: process.version }, { info: message => log.push(JSON.parse(message)) })
  return { POST: exports.POST, log }
}

test('controlled SSE remains unavailable on production and when authorization expires', async () => {
  for (const [env, req] of [
    [{}, request()],
    [validEnv(), request('yuehaiai.netlify.app')],
    [{ ...validEnv(), STREAM_DIAGNOSTIC_MODE: 'production' }, request()],
    [{ ...validEnv(), STREAM_DIAGNOSTIC_PREVIEW_HOST: 'deploy-preview-124--yuehaiai.netlify.app' }, request()],
    [validEnv(), request(previewHost, { headers: {} })],
    [validEnv(), request(previewHost, { headers: { Authorization: 'Bearer wrong-token' } })],
    [validEnv(), request(previewHost, { headers: { Authorization: token } })],
    [{ ...validEnv(), STREAM_DIAGNOSTIC_UNTIL: new Date(Date.now() - 1).toISOString() }, request()],
    [{ ...validEnv(), STREAM_DIAGNOSTIC_UNTIL: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() }, request()],
  ]) {
    const { POST, log } = loadRoute(env)
    assert.equal((await POST(req)).status, 404)
    assert.deepEqual(log, [])
  }
})

test('controlled SSE sends heartbeats beyond 30 seconds then an explicit completion at 45 seconds', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'Date'], now: 100000 })
  const { POST, log } = loadRoute()
  const response = await POST(request())
  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-type'), /text\/event-stream/)
  const events = []
  const consumed = readSSEStream(response, event => events.push(event))
  for (let n = 0; n < 9; n++) {
    t.mock.timers.tick(5000)
    await Promise.resolve()
  }
  await consumed
  assert.equal(events.length, 10)
  assert.deepEqual(events.map(event => event.seq), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  assert.equal(events[7].elapsed_ms, 35000)
  assert.equal(events[8].elapsed_ms, 40000)
  assert.equal(events[9].event, 'diagnostic_complete')
  assert.equal(events[9].elapsed_ms, 45000)
  assert(events.every(event => event.probe_id === response.headers.get('x-stream-probe-id')))
  assert(!JSON.stringify({ events, log }).includes(token))
  assert.equal(log.at(-1).state, 'complete')
})

test('request abort closes the diagnostic stream without a completion event', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'Date'], now: 100000 })
  const abort = new AbortController()
  const { POST, log } = loadRoute()
  const events = []
  const response = await POST(request(previewHost, { signal: abort.signal }))
  const consumed = readSSEStream(response, event => events.push(event))
  t.mock.timers.tick(5000)
  await Promise.resolve()
  abort.abort()
  await consumed
  t.mock.timers.tick(60000)
  assert.equal(events.length, 2)
  assert(!events.some(event => event.event === 'diagnostic_complete'))
  assert.equal(log.at(-1).state, 'request_aborted')
})

test('reader cancellation stops server emission and a new request can complete', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'Date'], now: 100000 })
  const { POST, log } = loadRoute()
  const response = await POST(request())
  await response.body.cancel()
  t.mock.timers.tick(60000)
  assert.equal(log.at(-1).state, 'reader_cancelled')
  const retried = await POST(request())
  assert.notEqual(response.headers.get('x-stream-probe-id'), retried.headers.get('x-stream-probe-id'))
  const events = []
  const consumed = readSSEStream(retried, event => events.push(event))
  for (let n = 0; n < 9; n++) {
    t.mock.timers.tick(5000)
    await Promise.resolve()
  }
  await consumed
  assert.equal(events.at(-1).event, 'diagnostic_complete')
})
