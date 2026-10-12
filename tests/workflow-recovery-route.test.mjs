import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import { createRecoveryToken, verifyRecoveryToken } from '../app/api/utils/workflow-recovery.ts'
import { stripHiddenThinking } from '../service/sse-stream.ts'
const id = 'b908bb31-4fed-4820-9806-d28ffbf2c80b'
const key = 'server-only-test-key'
const compiled = ts.transpileModule(readFileSync(new URL('../app/api/workflows/recover/route.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
function loadRoute(fetcher) {
  const exports = {}
  const require = name => {
    if (name === '@/app/api/utils/common') return { getInfo: request => ({ user: `user_${request.cookies.get('session_id')?.value}` }) }
    if (name === '@/app/api/utils/workflow-recovery') return { verifyRecoveryToken }
    if (name === '@/config/server') return { DIFY_API_KEY: key, DIFY_API_URL: 'https://dify.invalid/v1' }
    if (name === '@/service/sse-stream') return { stripHiddenThinking }
    throw new Error(name)
  }
  new Function('require', 'exports', 'fetch', compiled)(require, exports, fetcher)
  return exports.POST
}
const request = (session = 'a', runId = id, token = createRecoveryToken(id, 'user_a', key)) => ({ cookies: { get: () => session ? { value: session } : undefined }, json: async () => ({ runId, token }) })

test('actual recovery route queries original run with matching identity and exposes only visible text', async () => {
  let calls = 0
  const POST = loadRoute(async (url, options) => {
    calls++
    assert.equal(url.pathname, `/v1/workflows/run/${id}`)
    assert.equal(url.searchParams.get('user'), 'user_a')
    assert.equal(options.headers.Authorization, `Bearer ${key}`)
    return Response.json({ id, status: 'succeeded', outputs: { text: '<think>private</think>完整答案', hidden: 'internal' }, inputs: { secret: 'private' } })
  })
  const result = await POST(request())
  assert.equal(result.headers.get('cache-control'), 'private, no-store')
  assert.deepEqual(await result.json(), { status: 'succeeded', answer: '完整答案' })
  assert.equal(calls, 1)
})

test('invalid credentials or another session never contact Dify', async () => {
  const POST = loadRoute(() => assert.fail('unauthorized upstream access'))
  for (const req of [request('b'), request(''), request('a', '../x'), request('a', id, 'bad'), request('a', id, createRecoveryToken(id, 'user_a', key, Date.now() - 700000))])
    assert.equal((await POST(req)).status, 403)
})

test('empty or ambiguous outputs are not success; upstream errors do not leak', async () => {
  for (const outputs of [{}, { answer: 'unconfigured' }, { text: '' }, { text: '<think>hidden</think>' }, { text: { object: 'invalid' } }]) {
    const POST = loadRoute(async () => Response.json({ id, status: 'succeeded', outputs }))
    assert.deepEqual(await (await POST(request())).json(), { status: 'empty_output' })
  }
  for (const status of ['failed', 'stopped', 'running', 'paused', 'partial-succeeded']) {
    const POST = loadRoute(async () => Response.json({ id, status, error: key, inputs: { secret: key } }))
    assert.deepEqual(await (await POST(request())).json(), { status })
  }
  const unavailable = await loadRoute(async () => { throw new Error(key) })(request())
  assert.equal(unavailable.status, 502)
  assert(!(await unavailable.text()).includes(key))
  const wrongRun = await loadRoute(async () => Response.json({ id: 'different', status: 'succeeded', outputs: { text: 'other user' } }))(request())
  assert.equal(wrongRun.status, 502)
})
