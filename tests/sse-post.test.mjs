import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import { readSSEStream } from '../service/sse-stream.ts'

const compiled = ts.transpileModule(readFileSync(new URL('../service/base.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function loadSSEPost(response) {
  const exports = {}
  const require = (name) => {
    if (name === '@/config') return { API_PREFIX: '/api' }
    if (name === '@/app/components/base/toast') return { default: { notify() {} } }
    if (name === './sse-stream') return { readSSEStream }
    throw new Error(`Unexpected import: ${name}`)
  }
  new Function('require', 'exports', 'globalThis', compiled)(require, exports, { fetch: async () => response })
  return exports.ssePost
}

test('workflow consumer reports premature EOF immediately and keeps delivered chunks', async () => {
  const response = new Response('data: {"event":"text_chunk","data":{"text":"部分正文"}}\n\n')
  const ssePost = loadSSEPost(response)
  let partial = ''
  let error = ''
  let completed = false
  await ssePost('/workflows/run', { body: {} }, {
    onTextChunk: text => { partial += text },
    onWorkflowFinished: () => assert.fail('Missing terminal event must not be fabricated'),
    onCompleted: () => { completed = true },
    onError: message => { error = message },
  })
  assert.equal(partial, '部分正文')
  assert.match(error, /workflow_finished/)
  assert.equal(completed, false)
})

test('completion consumer still accepts EOF without a workflow terminal event', async () => {
  const response = new Response('data: {"event":"message","answer":"完整正文","id":"message-1"}\n\n')
  const ssePost = loadSSEPost(response)
  let answer = ''
  let completed = false
  await ssePost('/completion-messages', { body: {} }, {
    onData: text => { answer += text },
    onCompleted: () => { completed = true },
    onError: message => assert.fail(message),
  })
  assert.equal(answer, '完整正文')
  assert.equal(completed, true)
})
