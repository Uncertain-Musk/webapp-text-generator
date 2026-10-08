import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import { buildWorkflowInputs } from '../utils/workflow-context.ts'

// Execute the actual route with an isolated SDK double. No real Dify request.
const compiled = ts.transpileModule(readFileSync(new URL('../app/api/workflows/run/route.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function loadRoute(runWorkflow) {
  const exports = {}
  const require = (name) => {
    if (name === '@/app/api/utils/common')
      return { client: { runWorkflow }, getInfo: () => ({ user: 'test-user' }) }
    if (name === '@/utils/workflow-context')
      return { buildWorkflowInputs }
    throw new Error(`Unexpected import: ${name}`)
  }
  // The source is our checked-in Route Handler, not user-provided code.
  new Function('require', 'exports', compiled)(require, exports)
  return exports.POST
}

test('actual route passes separate context into SDK inputs and forwards streaming before completion', async () => {
  let streamController
  let actualArgs
  const upstream = new ReadableStream({ start(controller) { streamController = controller } })
  const POST = loadRoute(async (...args) => {
    actualArgs = args
    return { data: upstream }
  })
  const payload = { inputs: { query: '退款申请需要多久处理？', extra: 'keep' }, platform_context: 'TikTok Shop', market_context: 'US', files: [] }
  const response = await POST({ json: async () => payload })
  assert.deepEqual(actualArgs, [{ ...payload.inputs, platform_context: 'TikTok Shop', market_context: 'US' }, 'test-user', true, []])
  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-type'), /text\/event-stream/)
  const firstChunk = 'data: {"event":"text_chunk","data":{"text":"测试分块"}}\n\n'
  streamController.enqueue(new TextEncoder().encode(firstChunk))
  const reader = response.body.getReader()
  const first = await reader.read()
  assert.equal(first.done, false)
  assert.equal(new TextDecoder().decode(first.value), firstChunk)
  streamController.close()
  assert.equal((await reader.read()).done, true)
})

test('actual route sends empty context for older clients without modifying query', async () => {
  let received
  const POST = loadRoute(async (inputs) => {
    received = inputs
    return { data: '' }
  })
  await POST({ json: async () => ({ inputs: { query: '平台规则问题' } }) })
  assert.deepEqual(received, { query: '平台规则问题', platform_context: '', market_context: '' })
})

test('actual route rejects invalid context and does not expose SDK error details', async () => {
  let calls = 0
  const POST = loadRoute(async () => {
    calls += 1
    throw new Error('Authorization: test-secret-do-not-expose')
  })
  const invalid = await POST({ json: async () => ({ inputs: {}, market_context: [] }) })
  assert.equal(invalid.status, 400)
  assert.equal(calls, 0)
  const failed = await POST({ json: async () => ({ inputs: { query: '问题' }, platform_context: 'TikTok Shop', market_context: 'US' }) })
  assert.equal(failed.status, 502)
  assert(!((await failed.text()).includes('test-secret')))
  assert.equal(calls, 1)
})
